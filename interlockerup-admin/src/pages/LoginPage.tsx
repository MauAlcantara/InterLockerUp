import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User, Eye, EyeOff, Mail } from "lucide-react" // Agregamos Mail
import forge from "node-forge"
import toast from "react-hot-toast"
import { BASE_URL } from "@/api/apiConfig"

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
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4 shadow-lg">
            {showOTPField ? <Mail className="w-8 h-8 text-primary-foreground" /> : <Lock className="w-8 h-8 text-primary-foreground" />}
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">InterLockerUp</h1>
          <p className="text-muted-foreground font-serif mt-2">Panel Administrativo</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              {showOTPField ? "Verificar Identidad" : "Iniciar Sesión"}
            </CardTitle>
            <CardDescription className="text-center font-serif">
              {showOTPField 
                ? "Se ha enviado un código de acceso a tu correo institucional" 
                : "Ingresa tus credenciales para acceder al sistema"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!showOTPField ? (
                /* VISTA NORMAL DE LOGIN */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Usuario o correo electrónico</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@uteq.edu.mx"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 font-serif"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="........"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 font-serif"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* VISTA DE CÓDIGO OTP */
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="space-y-2">
                    <Label htmlFor="otpCode" className="text-sm font-medium text-center block">
                      Código de Seguridad
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="otpCode"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="pl-10 h-12 text-center text-xl tracking-[0.3em] font-bold border-primary"
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
                <div className="flex items-center justify-end">
                  <button type="button" className="text-sm text-secondary hover:text-primary font-medium transition-colors">
                    Recuperar contraseña
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isLoading || (showOTPField && otpCode.length < 6)}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {showOTPField ? "Verificando..." : "Iniciando sesión..."}
                  </span>
                ) : (
                  showOTPField ? "Confirmar Acceso" : "Iniciar sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 font-serif">
          Sistema de gestión de lockers IoT - UTEQ 2026
        </p>
      </div>
    </div>
  )
}
