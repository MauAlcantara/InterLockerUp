import { useState } from "react"
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react"
import forge from "node-forge"
import { API_URL } from "../../config";

export default function LoginScreen({ onLogin, onGoToRegister }) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [password, setPassword] = useState("")

const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // --- INICIO DE CIFRADO HÍBRIDO ---
      const keyResponse = await fetch(`${API_URL}/auth/public-key`);
      if (!keyResponse.ok) throw new Error("No se pudo obtener la llave pública del servidor");
      const keyData = await keyResponse.json();
      const rsaPublicKey = forge.pki.publicKeyFromPem(keyData.publicKey);

      const aesKey = forge.random.getBytesSync(32);
      const iv = forge.random.getBytesSync(16);

      const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
      cipher.start({ iv: iv });
      cipher.update(forge.util.createBuffer(password, 'utf8'));
      cipher.finish();
      const encryptedPassword = forge.util.encode64(cipher.output.getBytes());

      const encryptedAesKey = forge.util.encode64(rsaPublicKey.encrypt(aesKey, 'RSA-OAEP'));
      // --- FIN DEL CIFRADO HÍBRIDO ---

      // Prepara el paquete encriptado para el alumno
      const payload = {
        studentId: studentId, 
        encryptedPassword: encryptedPassword,
        encryptedAesKey: encryptedAesKey,
        iv: forge.util.encode64(iv)
      };

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token); 
        localStorage.setItem('userName', data.usuario.nombre);

        if (data.usuario.rol === 'admin') {
          window.location.href = 'http://localhost:5174'; 
        } else {
          onLogin();
        }
      } else {
        alert(data.mensaje); 
      }
    } catch (error) {
      console.error(error);
      alert("Error al conectar con el servidor o fallo en cifrado.");
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b4dbb] to-[#1f78ff] flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
          <div className="w-14 h-14 bg-[#0b4dbb] rounded-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          InterLockerUp
        </h1>
        <p className="text-white/80 text-sm mt-2">
          Sistema de Casilleros UTEQ
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl">
        <div className="p-6 pt-8">
          <h2 className="text-xl font-semibold text-[#1e293b] text-center mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Iniciar Sesion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="studentId" className="text-sm font-medium text-[#1e293b] block">
                Matricula
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                <input
                  id="studentId"
                  type="text"
                  placeholder="Ingresa tu matricula"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#1e293b] block">
                Contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 h-12 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#1e293b] transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !studentId || !password}
              className="w-full h-12 rounded-lg bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-semibold text-base shadow-lg disabled:opacity-50 flex items-center justify-center"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button type="button" className="text-sm text-[#1f78ff] hover:text-[#0b4dbb] font-medium transition-colors">
              Olvidaste tu contraseña?
            </button>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-sm text-[#64748b]">No tienes cuenta?</span>
<button 
  type="button" 
  onClick={() => {
    console.log("¡Me hiciste clic!");
    console.log("La función onGoToRegister es:", onGoToRegister);
    if (onGoToRegister) onGoToRegister();
  }} 
  className="text-sm text-[#0b4dbb] hover:text-[#1f78ff] font-semibold transition-colors"
>
  Registrate
</button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
            <p className="text-xs text-[#64748b] text-center">Universidad Tecnologica de Queretaro</p>
            <p className="text-xs text-[#64748b] text-center mt-1">2026 InterLockerUp - Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    </div>
  )
}