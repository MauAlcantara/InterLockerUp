// ID estable del dispositivo: se genera una vez y se guarda en localStorage.
// Se envía como `deviceId` en login y verify-otp para que el backend
// registre el dispositivo verificado en gestion.user_devices.

const DEVICE_ID_KEY = "ilu_device_id";

export function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}
