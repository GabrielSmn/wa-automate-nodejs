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

async function start(client) {
  let allMessagesIds = [];
  let erros = 0;

  console.log('.....inicializando');
  await client.getAllChatsWithMessages().then((response) =>
    response.map((chat) => {
      try {
        client
          .getMessageById(chat.lastReceivedKey._serialized)
          .then((response) => {
            var signup_id_test = response.body.split('matricula: ')[1];
            if (signup_id_test) {
              allMessagesIds.push(signup_id_test);

              var data = JSON.stringify({
                signup_id: signup_id_test,
                token:
                  'AAAAC3NzaC1lZDI1NTE5AAAAIE8qgN4QjdQDawOfLiAU+ucNfUCa0HNLMz0T999',
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
                  console.log('response2', response.data.signup_confirmed);

                  contador = contador + 1;

                  if (
                    response.data.name &&
                    response.data.signup_confirmed === false
                  ) {
                    console.log('confirmei !', chat.id);
                    await client.sendText(
                      chat.id,
                      `😀 Boa *${
                        String(response.data.name.trimEnd()).split(' ')[0]
                      }*, desculpe a demora, sua inscrição foi confirmada 😀 \n\n*Salve esse contato na sua agenda*, avisaremos por aqui a data das próximas atividades.\n\nForte abraço e *fé na luta!*`
                    );

                    await client.sendText(
                      '120363043585898519@g.us',
                      `INSCRIÇÃO CONFIRMADA: \n*${String(
                        response.data.name.trimEnd()
                      )}*\n${signup_id_test}`
                    );

                    config.url =
                      'https://etb-api-prod.herokuapp.com/user-confirmed-signup';
                    axios(config)
                      .then(async function (response) {
                        console.log('Usuário setado no banco :', response);
                      })
                      .catch(function (error) {
                        console.log(error);
                      });
                  } else {
                    console.log('usuário já cadastrado');
                  }
                })
                .catch(async function (error) {
                  console.log('[ ERRO ] deu um erro, notificar admin');

                  await client.sendText(
                    '120363026466753921@g.us',
                    `${error} \n*contato :*\nwa.me/${chat.id.replace(
                      '@c.us',
                      ''
                    )}\n Mensagem do sistem a re-check`
                  );
                });
            }
          });
      } catch (e) {
        erros + 1;
      }
    })
  );

  await client.sendText(
    '120363026466753921@g.us',
    `Bot reinicializado`
  );

  console.log('fim da inicialização');

  var contador = 237;

  client.onMessage(async (message) => {
    var signup_id_test = message.body.split('matricula: ')[1];

    var data = JSON.stringify({
      signup_id: signup_id_test,
      token: 'AAAAC3NzaC1lZDI1NTE5AAAAIE8qgN4QjdQDawOfLiAU+ucNfUCa0HNLMz0T999',
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
        console.log('response2', response.data.signup_confirmed);

        contador = contador + 1;

        if (response.data.name && response.data.signup_confirmed === false) {
          console.log('confirmei !');
          await client.sendText(
            message.from,
            `😀 Boa *${
              String(response.data.name.trimEnd()).split(' ')[0]
            }*, sua inscrição foi confirmada! \n\n*Salve esse contato na sua agenda*, avisaremos por aqui a data das próximas atividades.\n\nForte abraço e *fé na luta!*`
          );

          await client.sendText(
            '120363043585898519@g.us',
            `INSCRIÇÃO CONFIRMADA: \n*${String(
              response.data.name.trimEnd()
            )}*\n${signup_id_test}`
          );

          config.url =
            'https://etb-api-prod.herokuapp.com/user-confirmed-signup';
          axios(config)
            .then(async function (response) {
              console.log('Usuário setado no banco :', response);
            })
            .catch(function (error) {
              console.log(error);
            });
        } else {
          if (response.data.signup_confirmed === true) {
            console.log('confirmada: ', response.data);
            await client.sendText(
              message.from,
              `... *${response.data.name.trimEnd()}*, sua inscrição está confirmada 😀`
            );
          } else {
            await client.sendText(
              message.from,
              `Oi ${message.notifyName} \n\nNão encontramos a sua inscrição em nosso banco de dados ☹️\n\nCaso *queira se inscrever* vá para: \n\nhttps://trabalhodebase.com/brigadas`
            );
          }
        }
      })
      .catch(async function (error) {
        console.log('[ ERRO ] deu um erro, notificar admin');

        await client.sendText(
          '120363026466753921@g.us',
          `${error} \n*contato :*\nwa.me/${message.from.replace(
            '@c.us',
            ''
          )}\n *mensagem* :\n${message.body}\n`
        );
      });
  });
}
