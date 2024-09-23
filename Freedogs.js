const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const crypto = require('crypto');

class FreeDogsAPIClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": "https://app.freedogs.bot",
            "Referer": "https://app.freedogs.bot/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Tunggu ${i} detik untuk melanjutkan  =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async callAPI(initData) {
        const url = `https://api.freedogs.bot/miniapps/api/user/telegram_auth?invitationCode=oscKOfyL&initData=${initData}`;
        
        try {
            const response = await axios.post(url, {}, { headers: this.headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    isExpired(token) {
        const [header, payload, sign] = token.split('.');
        const decodedPayload = Buffer.from(payload, 'base64').toString();
        
        try {
            const parsedPayload = JSON.parse(decodedPayload);
            const now = Math.floor(DateTime.now().toSeconds());
            
            if (parsedPayload.exp) {
                const expirationDate = DateTime.fromSeconds(parsedPayload.exp).toLocal();
                this.log(colors.green(`FreeDogs Auto claim By_Kaguya | Query  di ambil pada : ${expirationDate.toFormat('yyyy-MM-dd HH:mm:ss')}`));
                
                const isExpired = now > parsedPayload.exp;
                this.log(colors.cyan(`Apakah Query nya sudah habis masa berlakunya?? ${isExpired ? 'Benar sekali, Anda perlu mengganti Query nya bro' : 'Belum..percepat kecepatan penuh'}`));
                
                return isExpired;
            } else {
                this.log(colors.yellow(`Token vĩnh cửu không đọc được thời gian hết hạn`));
                return false;
            }
        } catch (error) {
            this.log(colors.red(`Lỗi rồi: ${error.message}`), 'error');
            return true;
        }
    }

    async getGameInfo(token) {
        const url = "https://api.freedogs.bot/miniapps/api/user_game_level/GetGameInfo?";
        const headers = { ...this.headers, "Authorization": `Bearer ${token}` };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.code === 0) {
                const data = response.data.data;
                this.log(`Saldo saat ini: ${data.currentAmount}`, 'custom');
                this.log(`Coin Pool: ${data.coinPoolLeft}/${data.coinPoolLimit}`, 'custom');
                this.log(`Jumlah Coin yg di dapat hari ini: ${data.userToDayNowClick}/${data.userToDayMaxClick}`, 'custom');
                return { success: true, data: data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    md5(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }

    async collectCoin(token, gameInfo) {
        const url = "https://api.freedogs.bot/miniapps/api/user_game/collectCoin";
        const headers = { ...this.headers, "Authorization": `Bearer ${token}` };

        let collectAmount = Math.min(gameInfo.coinPoolLeft, 10000 - gameInfo.userToDayNowClick);
        const collectSeqNo = Number(gameInfo.collectSeqNo);
        const hashCode = this.md5(collectAmount + String(collectSeqNo) + "7be2a16a82054ee58398c5edb7ac4a5a");

        const params = new URLSearchParams({
            collectAmount: collectAmount,
            hashCode: hashCode,
            collectSeqNo: collectSeqNo
        });

        try {
            const response = await axios.post(url, params, { headers });
            if (response.status === 200 && response.data.code === 0) {
                this.log(`Berhasil dikumpulkan ${collectAmount} coin`, 'success');
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    
    async getTaskList(token) {
        const url = "https://api.freedogs.bot/miniapps/api/task/lists?";
        const headers = { ...this.headers, "Authorization": `Bearer ${token}` };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.code === 0) {
                const tasks = response.data.data.lists.filter(task => task.isFinish === 0);
                return { success: true, data: tasks };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async completeTask(token, taskId) {
        const url = `https://api.freedogs.bot/miniapps/api/task/finish_task?id=${taskId}`;
        const headers = { ...this.headers, "Authorization": `Bearer ${token}` };

        try {
            const response = await axios.post(url, {}, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processTasks(token, userId) {
        const taskListResult = await this.getTaskList(token);
        if (taskListResult.success) {
            for (const task of taskListResult.data) {
                this.log(`Mengerjakan taks: ${task.name}`, 'info');
                const completeResult = await this.completeTask(token, task.id);
                if (completeResult.success) {
                    this.log(`${`mengerjakan taks`.white} ${task.name.yellow} Selesai  | Berhasil mendapatkan  : ${task.rewardParty.toString().green}`);
                } else {
                    this.log(`Không thể hoàn thành nhiệm vụ ${task.name}: ${completeResult.error}`, 'error');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            this.log(`Tidak dapat memperoleh daftar taks Untuk akun ${userId}: ${taskListResult.error}`, 'error');
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const tokenFile = path.join(__dirname, 'token.json');
        let tokens = {};

        if (fs.existsSync(tokenFile)) {
            tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
        }

        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        while (true) {
            for (let i = 0; i < data.length; i++) {
                const rawInitData = data[i];
                const initData = rawInitData.replace(/&/g, '%26').replace(/=/g, '%3D');
                const userDataStr = decodeURIComponent(initData.split('user%3D')[1].split('%26')[0]);
                const userData = JSON.parse(decodeURIComponent(userDataStr));
                const userId = userData.id;
                const firstName = userData.first_name;

                console.log(`========== Akun Ke ${i + 1} | ${firstName.green} ==========`);

                let token = tokens[userId];
                let needNewToken = !token || this.isExpired(token);

                if (needNewToken) {
                    this.log(`Perlu mendapatkan token baru untuk akun ${userId}...`, 'info');
                    const apiResult = await this.callAPI(initData);
                    
                    if (apiResult.success) {
                        this.log(`mengambil  token Selesai  Untuk akun ${userId}`, 'success');
                        tokens[userId] = apiResult.data.token;
                        token = apiResult.data.token;
                        fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));
                        this.log(`Token baru telah disimpan untuk akun tersebut ${userId}`, 'info');
                    } else {
                        this.log(`mengambil  token gagal untuk akun tersebut  ${userId}: ${apiResult.error}`, 'error');
                        continue;
                    }
                }

                const gameInfoResult = await this.getGameInfo(token);
                if (gameInfoResult.success) {
                    
                    if (gameInfoResult.data.coinPoolLeft > 0) {
                        await this.collectCoin(token, gameInfoResult.data);
                    } else {
                        this.log(`Tidak ada koin untuk dikumpulkan Untuk akun ${userId}`, 'warning');
                    }

                    await this.processTasks(token, userId);
                } else {
                    this.log(`Tidak dapat memperoleh informasi game Untuk akun ${userId}: ${gameInfoResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        await this.countdown(120);
        }
    }
}

const client = new FreeDogsAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
