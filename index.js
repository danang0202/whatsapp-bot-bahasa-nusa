// Import Module 
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "baileys";
import pino from "pino";
import chalk from "chalk";
import readline from "readline";
import { resolve } from "path";
import { version } from "os";

// Metode Pairing
const usePairingCode = true

// Promt Input Terminal
async function question(promt) {
    process.stdout.write(promt)
    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    return new Promise((resolve) => r1.question("", (ans) => {
        r1.close()
        resolve(ans)
    }))
    
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./storage/bahasa-nusa-sesi')
  
  // Versi Terbaru
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`BahasaNusa Using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const bahasaNusa = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !usePairingCode,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    version: version,
    syncFullHistory: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
      }
      return proto.Message.fromObject({})
    }
  })

  // Handle Pairing Code
  if (usePairingCode && !bahasaNusa.authState.creds.registered) {
    try {
      const phoneNumber = await question('☘️ Masukan Nomor Yang Diawali Dengan 62 :\n')
      const code = await bahasaNusa.requestPairingCode(phoneNumber.trim())
      console.log(`🎁 Pairing Code : ${code}`)
    } catch (err) {
      console.error('Failed to get pairing code:', err)
    }
  }
    // Menyimpan Sesi Login
    bahasaNusa.ev.on("creds.update", saveCreds)

    // Informasi Koneksi
    bahasaNusa.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update
        if ( connection === "close") {
            console.log(chalk.red("❌  Koneksi Terputus, Mencoba Menyambung Ulang"))
            connectToWhatsApp()
        } else if ( connection === "open") {
            console.log(chalk.green("✔  Bot Berhasil Terhubung Ke WhatsApp"))
        }
    })

    // Respon Pesan Masuk
    bahasaNusa.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]

        if (!msg.message) return
        if (msg.key.fromMe) return // Ignore pesan dari bot sendiri

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const sender = msg.key.remoteJid
        const pushname = msg.pushName || "BahasaNusa"

        // Log Pesan Masuk Terminal
        const listColor = ["red", "green", "yellow", "magenta", "cyan", "white", "blue"]
        const randomColor = listColor[Math.floor(Math.random() * listColor.length)]

        console.log(
          chalk.yellow.bold("Credit : BahasaNusa"),
          chalk.green.bold("[ WhatsApp ]"),
          chalk[randomColor](pushname),
          chalk[randomColor](" : "),
          chalk.white(body)
        )

        import("./src/handlers/bahasa-nusa.js").then(mod => mod.default(bahasaNusa, m));
    })
    
}

// Jalankan Koneksi WhatsApp
connectToWhatsApp();