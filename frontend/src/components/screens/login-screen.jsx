import { useState } from "react"
import { Lock, User, Eye, EyeOff, Loader2, Mail } from "lucide-react"
import Button from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent } from "../ui/card"
import colors from "../theme/colors"
import fonts from "../theme/typography"
import forge from "node-forge"
import toast, { Toaster } from "react-hot-toast"

const api = import.meta.env.VITE_API_URL

const getDeviceId = () => {
    let id = localStorage.getItem("device_id");
    if (!id) {
        id = forge.util.encode64(forge.random.getBytesSync(16));
        localStorage.setItem("device_id", id);
    }
    return id;
};

async function getPublicKey() {
    const res = await fetch(`${api}/api/auth/public-key`)
    const data = await res.json()
    return data.publicKey
}

async function encryptPassword(password) {
    try {
        const publicKeyPem = await getPublicKey()
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
        const aesKey = forge.random.getBytesSync(32)
        const iv = forge.random.getBytesSync(16)
        const cipher = forge.cipher.createCipher("AES-CBC", aesKey)
        cipher.start({ iv })
        cipher.update(forge.util.createBuffer(password))
        cipher.finish()
        return {
            encryptedPassword: forge.util.encode64(cipher.output.getBytes()),
            encryptedAesKey: forge.util.encode64(publicKey.encrypt(aesKey, "RSA-OAEP")),
            iv: forge.util.encode64(iv)
        }
    } catch (e) {
        throw new Error("Error en el cifrado de seguridad")
    }
}

export default function LoginScreen({ onLogin, onGoToRegister }) {
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [studentId, setStudentId] = useState("")
    const [password, setPassword] = useState("")
    const [showOTPField, setShowOTPField] = useState(false)
    const [otpCode, setOtpCode] = useState("")

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        
        if (studentId.length < 5) return toast.error("La matrícula parece ser demasiado corta")
        if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres")

        setIsLoading(true)

        try {
            const encrypted = await encryptPassword(password)
            const deviceId = getDeviceId();

            const response = await fetch(`${api}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId,
                    encryptedPassword: encrypted.encryptedPassword,
                    encryptedAesKey: encrypted.encryptedAesKey,
                    iv: encrypted.iv,
                    deviceId,
                    otpCode: showOTPField ? otpCode : null
                })
            })

            const data = await response.json()

            if (response.status === 203) {
                toast.success("Verificación enviada al correo")
                setShowOTPField(true)
                return
            }

            if (!response.ok) throw new Error(data.mensaje || "Error al iniciar sesión")

            localStorage.setItem("token", data.token)
            toast.success("¡Bienvenido!")
            setTimeout(() => onLogin(data.usuario), 1000)

        } catch (err) {
            toast.error(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div 
            className="min-h-screen flex flex-col bg-gradient-to-b" 
            style={{ backgroundImage: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})` }}
        >
            <Toaster position="top-center" reverseOrder={false} />

            {/* Header */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
                    <img src="/logo.png" alt="logo" className="w-40 h-40 object-contain" />
                </div>
                <h1 style={{ fontFamily: fonts.primary }} className="text-3xl font-bold text-white text-center">
                    InterLockerUp
                </h1>
                <p style={{ fontFamily: fonts.secondary }} className="text-white/80 text-sm mt-2 text-center">
                    Sistema de Casilleros UTEQ
                </p>
            </div>

            {/* Login Card */}
            <Card className="rounded-t-3xl rounded-b-none shadow-2xl border-0">
                <CardContent className="p-6 pt-8">
                    <h2 style={{ fontFamily: fonts.primary }} className="text-xl font-semibold text-foreground text-center mb-6">
                        {showOTPField ? "Confirmar Identidad" : "Iniciar Sesión"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!showOTPField ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="studentId" className="text-sm font-medium text-foreground">
                                        Matrícula
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input 
                                            id="studentId" 
                                            type="text" 
                                            placeholder="Ingresa tu matrícula" 
                                            value={studentId} 
                                            onChange={(e) => setStudentId(e.target.value.trim())} 
                                            className="pl-10 h-12 rounded-lg border-border bg-muted/50 focus:bg-background" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                                        Contraseña
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input 
                                            id="password" 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="Ingresa tu contraseña" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            className="pl-10 pr-10 h-12 rounded-lg border-border bg-muted/50 focus:bg-background" 
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-center text-muted-foreground">
                                    Se detectó un nuevo dispositivo. Ingresa el código enviado a tu correo registrado.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor="otpCode" className="text-sm font-medium text-foreground">
                                        Código de Verificación
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input 
                                            id="otpCode" 
                                            type="text" 
                                            placeholder="6 dígitos" 
                                            value={otpCode} 
                                            onChange={(e) => setOtpCode(e.target.value)} 
                                            className="pl-10 h-12 text-center text-xl font-bold rounded-lg border-border" 
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={isLoading || !studentId || !password} 
                            style={{ fontFamily: fonts.primary, backgroundColor: colors.primary }} 
                            className="w-full h-12 rounded-lg hover:bg-opacity-90 text-white font-semibold text-base shadow-lg transition-all"
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        <span>{showOTPField ? "Verificando..." : "Ingresando..."}</span>
                                    </>
                                ) : (
                                    <span>{showOTPField ? "Confirmar Código" : "Ingresar"}</span>
                                )}
                            </div>
                        </Button>
                    </form>

                    <div className="mt-6 text-center space-y-3">
                        {!showOTPField && (
                            <button type="button" className="text-sm text-secondary hover:text-primary font-medium transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        )}

                        <div className="flex items-center gap-2 justify-center">
                            <span className="text-sm text-muted-foreground">¿No tienes cuenta?</span>
                            <button 
                                type="button" 
                                onClick={onGoToRegister} 
                                className="text-sm" 
                                style={{ color: colors.primary, fontFamily: fonts.primary, fontWeight: 600 }}
                            >
                                Regístrate
                            </button>
                        </div>
                        
                        {showOTPField && (
                            <button 
                                type="button" 
                                onClick={() => setShowOTPField(false)} 
                                className="text-xs text-muted-foreground hover:text-primary block w-full text-center mt-2"
                            >
                                Volver al login normal
                            </button>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs text-muted-foreground text-center">Universidad Tecnológica de Querétaro</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                            © 2026 InterLockerUp - Todos los derechos reservados
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}