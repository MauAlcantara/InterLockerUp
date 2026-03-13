import { useState } from "react"
import { Lock, User, Eye, EyeOff, Loader2, Mail, Phone, ArrowLeft, GraduationCap } from "lucide-react"
import { API_URL } from "../../config";

const carreras = [
  "Ingenieria en Sistemas Computacionales",
  "Ingenieria Industrial",
  "Ingenieria en Mecatronica",
  "Ingenieria en Energias Renovables",
  "Licenciatura en Administracion",
  "Licenciatura en Contaduria",
  "Licenciatura en Gastronomia",
]

export default function RegisterScreen({ onRegister, onBackToLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    studentId: "", email: "", phone: "", fullName: "", carrera: "", password: "", confirmPassword: "",
  })

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Si estamos en el paso 1, solo avanzamos al paso 2
    if (step === 1) { 
        setStep(2); 
        return; 
    }
    
    // Si estamos en el paso 2, iniciamos la petición al servidor
    setIsLoading(true)
    
    try {
      // 1. Prepara el paquete con los nombres exactos que espera el backend
      const payload = {
        studentId: formData.studentId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        carrera: formData.carrera,
        password: formData.password
      };

      // 2. Envia la petición POST a la ruta de registro
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
        onBackToLogin(); 
      } else {
        alert(data.mensaje || "Error al registrar la cuenta.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error al conectar con el servidor. Verifica que esté encendido.");
    } finally {
      setIsLoading(false)
    }
}
    const isStep1Valid = formData.studentId && formData.email && formData.fullName && formData.carrera
    const isStep2Valid = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b4dbb] to-[#1f78ff] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <button
          type="button"
          onClick={step === 1 ? onBackToLogin : () => setStep(1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{step === 1 ? "Volver al inicio" : "Paso anterior"}</span>
        </button>
      </div>

      <div className="flex flex-col items-center px-6 pb-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-3">
          <div className="w-10 h-10 bg-[#0b4dbb] rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Crear Cuenta
        </h1>
        <p className="text-white/80 text-sm mt-1">Paso {step} de 2</p>
        <div className="flex items-center gap-2 mt-4">
          <div className={`w-12 h-1.5 rounded-full ${step >= 1 ? "bg-white" : "bg-white/30"}`} />
          <div className={`w-12 h-1.5 rounded-full ${step >= 2 ? "bg-white" : "bg-white/30"}`} />
        </div>
      </div>

      {/* Register Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl">
        <div className="p-6 pt-8">
          <h2 className="text-lg font-semibold text-[#1e293b] text-center mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {step === 1 ? "Informacion Personal" : "Crear Contrasena"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-[#1e293b] block">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="fullName" type="text" placeholder="Nombre y apellidos" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} className="w-full pl-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="studentId" className="text-sm font-medium text-[#1e293b] block">Matricula</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="studentId" type="text" placeholder="Ej: 20231234" value={formData.studentId} onChange={(e) => updateField("studentId", e.target.value)} className="w-full pl-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#1e293b] block">Correo Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="email" type="email" placeholder="correo@uteq.edu.mx" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full pl-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-[#1e293b] block">Telefono (Opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="phone" type="tel" placeholder="10 digitos" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full pl-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="carrera" className="text-sm font-medium text-[#1e293b] block">Carrera</label>
                  <select id="carrera" value={formData.carrera} onChange={(e) => updateField("carrera", e.target.value)} className="w-full h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm px-3">
                    <option value="">Selecciona tu carrera</option>
                    {carreras.map((carrera) => (
                      <option key={carrera} value={carrera}>{carrera}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-[#1e293b] block">Contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="password" type={showPassword ? "text" : "password"} placeholder="Minimo 8 caracteres" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="w-full pl-10 pr-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#1e293b]">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-[#1e293b] block">Confirmar Contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Repite tu contrasena" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className="w-full pl-10 pr-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#1e293b]">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-[#c94a4a]">Las contrasenas no coinciden</p>
                )}
                <div className="bg-[#f1f5f9] rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium text-[#1e293b]">Tu contrasena debe contener:</p>
                  <ul className="space-y-1 text-[#64748b]">
                    <li className={formData.password.length >= 8 ? "text-[#2fa4a9]" : ""}>- Minimo 8 caracteres</li>
                    <li className={/[A-Z]/.test(formData.password) ? "text-[#2fa4a9]" : ""}>- Al menos una mayuscula</li>
                    <li className={/[0-9]/.test(formData.password) ? "text-[#2fa4a9]" : ""}>- Al menos un numero</li>
                  </ul>
                </div>
              </>
            )}

            <button type="submit" disabled={isLoading || (step === 1 ? !isStep1Valid : !isStep2Valid)} className="w-full h-12 rounded-lg bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-semibold text-base shadow-lg mt-6 disabled:opacity-50 flex items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {isLoading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creando cuenta...</>) : step === 1 ? "Continuar" : "Crear Cuenta"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e2e8f0]">
            <p className="text-xs text-[#64748b] text-center">
              Al registrarte, aceptas los{" "}
              <button type="button" className="text-[#1f78ff] hover:underline">Terminos y Condiciones</button>{" "}
              y la{" "}
              <button type="button" className="text-[#1f78ff] hover:underline">Politica de Privacidad</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}