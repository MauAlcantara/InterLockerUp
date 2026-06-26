import { useState } from "react"
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react"
import Button from "../ui/button"
import { Input } from "../ui/input"
import { Card, CardContent } from "../ui/card"
import colors from "../theme/colors"
import fonts from "../theme/typography"
import toast from "react-hot-toast"

const api = import.meta.env.VITE_API_URL

export default function OtpScreen({ studentId, onVerified, onBack }) {
    const [otp, setOtp] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleVerify = async (e) => {
        e.preventDefault()
        if (otp.length < 6) return toast.error("Ingresa el código de 6 dígitos")

        setIsLoading(true)
        try {
            const response = await fetch(`${api}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, otp })
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.mensaje || "Código inválido")

            toast.success("Verificación exitosa")
            localStorage.setItem("token", data.token)
            
            // Enviamos el usuario al padre para que lo mande a la pantalla de PIN
            onVerified(data.usuario)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b"
             style={{ backgroundImage: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})` }}>
            
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-white">
                <ShieldCheck className="w-16 h-16 mb-4 text-white/90" />
                <h1 style={{ fontFamily: fonts.primary }} className="text-2xl font-bold text-center">
                    Verifica tu Identidad
                </h1>
                <p className="text-white/80 text-sm mt-2 text-center max-w-[250px]">
                    Hemos enviado un código a tu correo institucional de la UTEQ
                </p>
            </div>

            <Card className="rounded-t-3xl rounded-b-none shadow-2xl border-0">
                <CardContent className="p-6 pt-10">
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2 text-center">
                            <label className="text-sm font-medium text-muted-foreground">Código de 6 dígitos</label>
                            <Input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-2xl tracking-[1rem] h-14 font-bold border-primary/20 focus:border-primary"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || otp.length < 6}
                            style={{ backgroundColor: colors.primary }}
                            className="w-full h-12 rounded-lg text-white font-semibold"
                        >
                            <div className="flex items-center justify-center">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                {isLoading ? "Verificando..." : "Confirmar Código"}
                            </div>
                        </Button>

                        <button 
                            type="button" 
                            onClick={onBack}
                            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver al Login
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
