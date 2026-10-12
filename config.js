import { Platform } from "react-native";

// HP fisik (Expo Go): isi dengan IPv4 laptop di Wi-Fi yang sama, contoh "192.168.1.10".
// Emulator/simulator: biarkan kosong "".
const LAPTOP_IP = "";

export const API_BASE_URL = LAPTOP_IP
  ? `http://${LAPTOP_IP}:3000/api`
  : Platform.OS === "android"
    ? "http://10.0.2.2:3000/api"
    : "http://localhost:3000/api";
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api$/, "");
