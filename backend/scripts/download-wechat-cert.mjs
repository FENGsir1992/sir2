import fs from "fs";
import path from "path";
import crypto from "crypto";

const mchid   = process.env.WECHAT_MCH_ID           || process.argv[2];
const serial  = process.env.WECHAT_SERIAL_NO        || process.argv[3];
const keyPath = process.env.WECHAT_PRIVATE_KEY_PATH || process.argv[4] || "backend/certs/wechat/apiclient_key.pem";
const apiV3   = process.env.WECHAT_API_V3_KEY       || process.argv[5];
const apiBase = process.env.WECHAT_API_BASE         || "https://api.mch.weixin.qq.com";

if (!mchid || !serial || !keyPath || !apiV3) {
  console.error("缺少参数：WECHAT_MCH_ID / WECHAT_SERIAL_NO / WECHAT_PRIVATE_KEY_PATH / WECHAT_API_V3_KEY");
  process.exit(1);
}

const urlPath = "/v3/certificates";
const url     = new URL(urlPath, apiBase).toString();

function readPem(p){ return fs.readFileSync(p, "utf8"); }

function buildAuthHeader(method, canonicalUrl, body, mchid, serialNo, privateKeyPem){
  const timestamp = Math.floor(Date.now()/1000).toString();
  const nonceStr  = crypto.randomBytes(16).toString("hex");
  const message   = `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(privateKeyPem, "base64");
  const token = `mchid="${mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
  return `WECHATPAY2-SHA256-RSA2048 ${token}`;
}

function aesGcmDecrypt(enc, apiV3Key){
  const key = Buffer.from(apiV3Key, "utf8");
  const data = Buffer.from(enc.ciphertext, "base64");
  const authTag = data.slice(data.length - 16);
  const cipherText = data.slice(0, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, enc.nonce);
  if (enc.associated_data) decipher.setAAD(Buffer.from(enc.associated_data, "utf8"));
  decipher.setAuthTag(authTag);
  const decoded = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decoded.toString("utf8");
}

async function main(){
  const privateKey = readPem(keyPath);
  const auth = buildAuthHeader("GET", urlPath, "", mchid, serial, privateKey);

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": auth,
      "Accept": "application/json",
      "Accept-Language": "zh-CN", 
      "User-Agent": "wechat-cert-downloader/1.0.0",
    },
  });
  if(!resp.ok){
    const text = await resp.text();
    throw new Error(`GET /v3/certificates 失败: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  const list = Array.isArray(json?.data) ? json.data : [];
  if(list.length === 0){ console.log("未返回平台证书列表"); return; }

  const outDir = path.join(process.cwd(), "backend", "certs", "wechat");
  fs.mkdirSync(outDir, { recursive: true });

  let saved = 0;
  for(const item of list){
    const sn  = item.serial_no || item.serialNo || "unknown";
    const enc = item.encrypt_certificate;
    if(!enc || !enc.ciphertext) continue;

    const pem = aesGcmDecrypt(enc, apiV3);
    const outFile = path.join(outDir, `platform_${sn}.pem`);
    fs.writeFileSync(outFile, pem, "utf8");
    console.log(`已保存平台证书: ${outFile}`);
    saved++;
  }
  if(saved === 0) console.log("未能解密出任何平台证书，请检查 APIv3Key 是否正确。");
  else console.log(`完成：共写入 ${saved} 个平台证书。`);
}

main().catch(e => { console.error("脚本执行失败:", e.message || e); process.exit(1); });
