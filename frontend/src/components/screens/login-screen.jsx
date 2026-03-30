import { useState } from "react"
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react"
import Button from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent } from "../ui/card"
import colors from "../theme/colors"
import fonts from "../theme/typography"
import forge from "node-forge"
import toast, { Toaster } from "react-hot-toast"

// --- CAMBIO CLAVE: Usar la URL que ya sabes que funciona ---
const API_URL = "https://admin.vigilia.world"; 

async function getPublicKey() {
    try {
        const res = await fetch(`${API_URL}/api/auth/public-key`)
        if (!res.ok) throw new Error("No se pudo conectar con el servidor de seguridad")
        const data = await res.json()
        return data.publicKey
    } catch (error) {
        throw new Error("Error al obtener llave de cifrado")
    }
}

async function encryptPassword(password) {
    try {
        const publicKeyPem = await getPublicKey()
        const rsaPublicKey = forge.pki.publicKeyFromPem(publicKeyPem)

        // Generación de llaves para cifrado híbrido
        const aesKey = forge.random.getBytesSync(32)
        const iv = forge.random.getBytesSync(16)

        // Cifrado AES de la contraseña
        const cipher = forge.cipher.createCipher("AES-CBC", aesKey)
        cipher.start({ iv })
        cipher.update(forge.util.createBuffer(password, "utf8"))
        cipher.finish()

        const encryptedPassword = forge.util.encode64(cipher.output.getBytes())
        
        // Cifrado RSA de la llave AES (RSA-OAEP es más seguro)
        const encryptedAesKey = forge.util.encode64(
            rsaPublicKey.encrypt(aesKey, "RSA-OAEP")
        )

        return {
            encryptedPassword,
            encryptedAesKey,
            iv: forge.util.encode64(iv)
        }
    } catch (e) {
        console.error("Error en cifrado:", e)
        throw new Error("Fallo en el protocolo de seguridad")
    }
}

export default function LoginScreen({ onLogin, onGoToRegister }) {
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [studentId, setStudentId] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (studentId.length < 5) {
            return toast.error("La matrícula es demasiado corta")
        }

        if (password.length < 6) {
            return toast.error("La contraseña debe tener al menos 6 caracteres")
        }

        setIsLoading(true)

        try {
            // Ejecutar cifrado antes de enviar
            const encrypted = await encryptPassword(password)

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId, // Asegúrate que tu backend acepte studentId para alumnos
                    encryptedPassword: encrypted.encryptedPassword,
                    encryptedAesKey: encrypted.encryptedAesKey,
                    iv: encrypted.iv
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.mensaje || "Credenciales incorrectas")
            }

            // Guardar token y sesión
            localStorage.setItem("token", data.token)
            toast.success("¡Bienvenido al sistema!")
            
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
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-white">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
                    <img src="/logo.png" alt="logo" className="w-20 h-20 object-contain" />
                </div>
                <h1 style={{ fontFamily: fonts.primary }} className="text-4xl font-bold tracking-tight">
                    InterLockerUp
                </h1>
                <p style={{ fontFamily: fonts.secondary }} className="opacity-90 text-sm mt-2">
                    Acceso Estudiantes UTEQ
                </p>
            </div>

            {/* Login Card */}
            <Card className="rounded-t-[3rem] rounded-b-none shadow-2xl border-0 overflow-hidden">
                <CardContent className="p-8 pt-10">
                    <h2 style={{ fontFamily: fonts.primary }} className="text-2xl font-bold text-slate-800 text-center mb-8">
                        Iniciar Sesión
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="studentId" className="text-sm font-semibold ml-1">Matrícula</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="studentId"
                                    placeholder="202XXXXXX"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value.trim())}
                                    className="pl-12 h-14 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold ml-1">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-12 pr-12 h-14 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !studentId || !password}
                            style={{ backgroundColor: colors.primary }}
                            className="w-full h-14 rounded-2xl text-white font-bold text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all mt-4"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Verificando...</span>
                                </div>
                            ) : "Entrar"}
                        </Button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-slate-500">¿Eres nuevo?</span>
                            <button
                                type="button"
                                onClick={onGoToRegister}
                                className="text-sm font-bold"
                                style={{ color: colors.primary }}
                            >
                                Crea una cuenta
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 pb-2">
                        <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest">
                            Universidad Tecnológica de Querétaro
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}