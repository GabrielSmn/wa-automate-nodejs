const wa = require('@open-wa/wa-automate');
var axios = require('axios');
const { RestTypeNodeParser } = require('ts-json-schema-generator');

wa.create({
  sessionId: 'ATENDENTE_ETB',
  multiDevice: true, //required to enable multiDevice support
  authTimeout: 60, //wait only 60 seconds to get a connection with the host account device
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  qrTimeout: 0, //0 means it will wait forever for you to scan the qr code
}).then((client) => start(client));

function safeGuard(number) {
  let corrigir = number.replace('@c.us', '');
  console.log(corrigir.length);
  if (corrigir.length < 13) {
    const nXnf = corrigir.slice(0, 4) + '9' + corrigir.slice(4);
    console.log('limpando : ', nXnf);

    return nXnf;
  }
  console.log('tava limpo já', corrigir);
  return corrigir;
}

function start(client) {

  client.onMessage(async (message) => {

    var data = JSON.stringify({
      phone: safeGuard(message.from),
      token:
        'AAAAC3NzaC1lZDI1NTE5AAAAIADyn0X4gYpS+GAlPXG4tjXBGduGXRD50KVIQu3hmbjG',
    });

    var config = {
      method: 'post',
      url: 'https://etb-api-prod.herokuapp.com/get-user-by-phone',
      headers: {
        'Content-Type': 'application/json',
      },
      data: data,
    };

    axios(config)
      .then(async function (response) {
        console.log('response', response.data);
        if (response.data.name && response.data.bot_called === false) {
          await client.sendText(
            message.from,
            `Boa ${response.data.name}, inscrição confirmada!`
          );
        } else {
            if(response.data.bot_called){
                await client.sendText(
                    message.from,
                    `... ${response.data.name}, sua inscrição foi confirmada já`
                  );
            }else{
                await client.sendText(
                    message.from,
                    `Não encontrei a sua inscrição, se precisa de ajuda chame no link: wa.me/5511982871523 que já já te respondem.`
                  );
            }
            
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  });
}
