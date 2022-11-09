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


function start(client) {

  client.onMessage(async (message) => {

    var signup_id_test = message.body.split("matricula: ")[1]

    var data = JSON.stringify({

      signup_id: signup_id_test,
      token:
        ',
    });

    var config = {
      method: 'post',
      url: 'https://etb-api-prod.herokuapp.com/get-user-by-signupid',
      headers: {
        'Content-Type': 'application/json',
      },
      data: data,
    };

    axios(config)
      .then(async function (response) {
        console.log('response', response.data.name);
        console.log('response2', response.data.signup_confirmed)


        if (response.data.name && response.data.signup_confirmed === false) {
          console.log("confirmei !")
          await client.sendText(
            message.from,
            `Boa *${String(response.data.name).split(" ")[0]}*,sua inscrição foi confirmada! 😀 \n\n*Salve esse contato na sua agenda*, avisaremos por aqui a data das próximas atividades.\n\nForte abraço e *fé na luta!*`
          );

          await client.sendText(
            '120363043585898519@g.us',
            `INSCRIÇÃO CONFIRMADA : \n*${String(response.data.name)}*\nwa.me/${message.from.replace("@c.us","")}\n${signup_id_test}`
          );
          

          config.url = 'https://etb-api-prod.herokuapp.com/user-confirmed-signup'
          axios(config)
          .then(async function (response) {console.log("Usuário setado no banco :", response)})
          .catch(function (error) {
            console.log(error);})
            

        } else {
            if(response.data.signup_confirmed===true){
              console.log("confirmada: ",response.data)
                await client.sendText(
                    message.from,
                    `... *${response.data.name}*, sua inscrição está confirmada 😀`
                  );
            }else{
                await client.sendText(
                    message.from,
                    `Oi ${message.notifyName} \n\nNão encontramos a sua inscrição em nosso banco de dados ☹️\n\nCaso *queira se inscrever* vá para: \n\nhttps://trabalhodebase.com/brigadas`
                  );
            }
            
        }
      })
      .catch(async function (error) {

    console.log("[ ERRO ] deu um erro, notificar admin")
        
    await client.sendText(
      '120363026466753921@g.us',
      `${error} \n*contato :*\nwa.me/${message.from.replace("@c.us","")}\n *mensagem* :\n${message.body}\n`)
   
       
      });
  });
}
