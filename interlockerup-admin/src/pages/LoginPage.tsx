import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, User, Eye, EyeOff, Mail, Loader2 } from "lucide-react"
import forge from "node-forge"
import toast from "react-hot-toast"
import { BASE_URL } from "@/api/apiConfig"
import logo from "@/assets/logo.png"

// Función para obtener/generar huella del dispositivo
const getDeviceId = () => {
  let id = localStorage.getItem("admin_device_id");
  if (!id) {
    id = forge.util.encode64(forge.random.getBytesSync(16));
    localStorage.setItem("admin_device_id", id);
  }
  return id;
};

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // --- NUEVOS ESTADOS PARA VERIFICACIÓN ---
  const [showOTPField, setShowOTPField] = useState(false)
  const [otpCode, setOtpCode] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!email || !password) {
      toast.error("Por favor ingresa tu usuario y contraseña")
      setIsLoading(false)
      return
    }

    try {
      // --- INICIO DE CIFRADO HÍBRIDO ---
      const keyResponse = await fetch(`${BASE_URL}/api/auth/public-key`);
      if (!keyResponse.ok) throw new Error("No se pudo obtener la llave pública");
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

      const deviceId = getDeviceId();

      const payload = {
        email: email,
        encryptedPassword: encryptedPassword,
        encryptedAesKey: encryptedAesKey,
        iv: forge.util.encode64(iv),
        deviceId: deviceId,
        otpCode: showOTPField ? otpCode : null // Enviamos el código si el campo está activo
      };

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // --- DETECCIÓN DE NUEVO DISPOSITIVO (STATUS 203) ---
      if (response.status === 203) {
        toast.success("Verificación requerida. Revisa tu correo.")
        setShowOTPField(true)
        setIsLoading(false)
        return;
      }

      if (response.ok) {
        if (data.usuario?.rol !== 'admin') {
          toast.error("Acceso denegado. No tienes privilegios de administrador.")
          setIsLoading(false)
          return;
        }

        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('userName', data.usuario.nombre_completo || data.usuario.nombre);

        toast.success("¡Bienvenido al sistema!")

        setTimeout(() => {
          navigate("/dashboard");
          setIsLoading(false);
        }, 1000);

      } else {
        toast.error(data.mensaje || "Credenciales incorrectas.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión o fallo de seguridad.")
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: "linear-gradient(to bottom, #0b4dbb, #1f78ff)" }}
    >
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 overflow-hidden">
          <img src={logo} alt="logo" className="w-full h-full object-contain p-2" />
        </div>
        <h1 className="text-3xl font-bold text-white text-center font-sans">
          InterLockerUp
        </h1>
        <p className="text-white/80 text-sm mt-2 text-center font-serif">
          Panel Administrativo
        </p>
      </div>

      {/* Login Card */}
      <Card className="rounded-t-3xl rounded-b-none shadow-2xl border-0">
        <CardContent className="p-6 pt-8">
          <h2 className="text-xl font-semibold text-foreground text-center mb-6 font-sans">
            {showOTPField ? "Verificar Identidad" : "Iniciar Sesión"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!showOTPField ? (
              /* VISTA NORMAL DE LOGIN */
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Usuario o correo electrónico
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@uteq.edu.mx"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-lg border-border bg-muted/50 focus:bg-background"
                      disabled={isLoading}
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
                      disabled={isLoading}
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
              /* VISTA DE CÓDIGO OTP */
              <div className="space-y-5 animate-in fade-in duration-500">
                <p className="text-sm text-center text-muted-foreground font-serif">
                  Se ha enviado un código de acceso a tu correo institucional
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otpCode" className="text-sm font-medium text-foreground">
                    Código de Seguridad
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="pl-10 h-12 rounded-lg border-border bg-muted/50 focus:bg-background text-center text-xl tracking-[0.3em] font-bold"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOTPField(false)}
                  className="text-xs text-primary w-full text-center hover:underline font-serif"
                >
                  Volver a ingresar datos
                </button>
              </div>
            )}

            {!showOTPField && (
              <div className="mt-6 text-center space-y-3">
                <button type="button" className="text-sm text-secondary hover:text-primary font-medium transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (showOTPField && otpCode.length < 6)}
              className="w-full h-12 rounded-lg text-white font-semibold text-base shadow-lg transition-all"
            >
              <div className="flex items-center justify-center w-full h-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span>{showOTPField ? "Verificando..." : "Iniciando sesión..."}</span>
                  </>
                ) : (
                  <span>{showOTPField ? "Confirmar Acceso" : "Iniciar sesión"}</span>
                )}
              </div>
            </Button>
          </form>

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
