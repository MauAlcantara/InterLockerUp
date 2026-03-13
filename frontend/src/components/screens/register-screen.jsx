import React, { useState } from "react"
import { Lock, User, Eye, EyeOff, Loader2, Mail, ArrowLeft, GraduationCap } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function RegisterScreen({ onRegister, onBackToLogin }) {
    const api = import.meta.env.VITE_API_URL
    const API_URL = `${api}/api/users/register`

    const carreras = [
        "División Económica-Administrativa",
        "División Industrial",
        "División de Tecnología Ambiental",
        "División de Tecnologías de Automatización e Información",
        "Desarrollo de negocios",
        "División de Idiomas"
    ]

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState(1)

    const [formData, setFormData] = useState({
        matricula: "",
        nombre_completo: "",
        email: "",
        carrera: "",
        password: "",
        confirmPassword: ""
    })

    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // --- VALIDACIONES PASO 1 ---
        if (step === 1) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@uteq\.edu\.mx$/
            if (!emailRegex.test(formData.email.trim())) {
                return toast.error("Usa un correo institucional válido (@uteq.edu.mx)")
            }
            if (formData.matricula.length < 7) {
                return toast.error("La matrícula no parece válida")
            }
            setStep(2)
            return
        }

        // --- VALIDACIONES PASO 2 ---
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Las contraseñas no coinciden")
        }

        if (formData.password.length < 8) {
            return toast.error("La contraseña debe tener al menos 8 caracteres")
        }

        setIsLoading(true)

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    matricula: formData.matricula.trim(),
                    nombre_completo: formData.nombre_completo.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    carrera: formData.carrera
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.mensaje || "Error al registrar usuario")
            }

            toast.success("¡Cuenta creada correctamente!")

            setTimeout(() => {
                if (onBackToLogin) onBackToLogin()
            }, 2000)

        } catch (error) {
            toast.error(error.message || "Error de conexión")
        } finally {
            setIsLoading(false)
        }
    }

    const isStep1Valid =
        formData.matricula &&
        formData.email &&
        formData.nombre_completo &&
        formData.carrera

    const isStep2Valid =
        formData.password &&
        formData.confirmPassword &&
        formData.password === formData.confirmPassword


    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0b4dbb] to-[#1f78ff] flex flex-col">
            <Toaster position="top-center" />

            <div className="px-4 pt-12 pb-4">
                <button
                    type="button"
                    onClick={step === 1 ? onBackToLogin : () => setStep(1)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">
                        {step === 1 ? "Volver al inicio" : "Paso anterior"}
                    </span>
                </button>
            </div>

            <div className="flex flex-col items-center px-6 pb-6">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
                    <img src="/logo.png" alt="logo" className="w-40 h-40 object-contain" />
                </div>

                <h1 className="text-2xl font-bold text-white text-center">Crear Cuenta</h1>
                <p className="text-white/80 text-sm mt-1">Paso {step} de 2</p>

                <div className="flex items-center gap-2 mt-4">
                    <div className={`w-12 h-1.5 rounded-full transition-all ${step >= 1 ? "bg-white" : "bg-white/30"}`} />
                    <div className={`w-12 h-1.5 rounded-full transition-all ${step >= 2 ? "bg-white" : "bg-white/30"}`} />
                </div>
            </div>

            <div className="flex-1 bg-white rounded-t-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-center mb-6">
                    {step === 1 ? "Información Personal" : "Seguridad"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 1 && (
                        <>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tu nombre completo"
                                        value={formData.nombre_completo}
                                        onChange={(e) => updateField("nombre_completo", e.target.value)}
                                        className="pl-10 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0b4dbb]/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Matrícula</label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Ej: 202312345"
                                        value={formData.matricula}
                                        onChange={(e) => updateField("matricula", e.target.value.replace(/\D/g, ""))}
                                        className="pl-10 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0b4dbb]/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Correo Institucional</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="usuario@uteq.edu.mx"
                                        value={formData.email}
                                        onChange={(e) => updateField("email", e.target.value.toLowerCase())}
                                        className="pl-10 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0b4dbb]/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">División Académica</label>
                                <select
                                    value={formData.carrera}
                                    onChange={(e) => updateField("carrera", e.target.value)}
                                    className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 outline-none focus:ring-2 focus:ring-[#0b4dbb]/20"
                                    required
                                >
                                    <option value="">Selecciona tu División</option>
                                    {carreras.map((carrera, index) => (
                                        <option key={index} value={carrera}>{carrera}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Mínimo 8 caracteres"
                                        value={formData.password}
                                        onChange={(e) => updateField("password", e.target.value)}
                                        className="pl-10 pr-10 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repite tu contraseña"
                                        value={formData.confirmPassword}
                                        onChange={(e) => updateField("confirmPassword", e.target.value)}
                                        className="pl-10 pr-10 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || (step === 1 ? !isStep1Valid : !isStep2Valid)}
                        className="w-full h-12 rounded-lg bg-[#0b4dbb] hover:bg-[#083a8d] disabled:bg-gray-300 text-white font-semibold mt-6 transition-all shadow-md active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center w-full h-full">
                            {isLoading ? (
                                <Loader2 className="animate-spin w-6 h-6" />
                            ) : (
                                <span>{step === 1 ? "Continuar" : "Crear Cuenta"}</span>
                            )}
                        </div>
                    </button>
                </form>
            </div>
        </div>
    )
}