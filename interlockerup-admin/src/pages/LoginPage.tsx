import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User, Eye, EyeOff,  } from "lucide-react"
import forge from "node-forge"
import toast from "react-hot-toast"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
      const keyResponse = await fetch('http://localhost:3000/api/auth/public-key');
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

      const payload = {
        email: email,
        encryptedPassword: encryptedPassword,
        encryptedAesKey: encryptedAesKey,
        iv: forge.util.encode64(iv)
      };

      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (data.usuario?.rol !== 'admin') {
          toast.error("Acceso denegado. No tienes privilegios de administrador.")
          setIsLoading(false)
          return;
        }

        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('userName', data.usuario.nombre_completo || data.usuario.nombre);
        
        // 1. Lanzamos la alerta
        toast.success("¡Bienvenido al sistema!")
        
        // 2. Esperamos 1 segundo ANTES de navegar para dejar que la alerta se vea
        setTimeout(() => {
          navigate("/dashboard");
          // No apagamos el Loading hasta que ya nos vamos
          setIsLoading(false); 
        }, 1000);

      } else {
        toast.error(data.mensaje || "Credenciales incorrectas.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión o fallo en el protocolo de cifrado.")
      setIsLoading(false)
    } 
    // OJO: Eliminamos el bloque 'finally' por completo para controlar el 'setIsLoading' manualmente
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">InterLockerUp</h1>
          <p className="text-muted-foreground font-serif mt-2">Panel Administrativo</p>
          
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">Iniciar Sesion</CardTitle>
            <CardDescription className="text-center font-serif">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">


              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Usuario o correo electronico
                </Label>
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
                <Label htmlFor="password" className="text-sm font-medium">
                  Contrasena
                </Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm text-secondary hover:text-primary font-medium transition-colors"
                >
                  Recuperar contraseña
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Iniciando sesion...
                  </span>
                ) : (
                  "Iniciar sesion"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 font-serif">
          Sistema de gestion de lockers IoT - UTEQ 2026
        </p>
      </div>
    </div>
  )
}
