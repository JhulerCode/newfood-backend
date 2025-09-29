import dayjs from 'dayjs'

const primary_color = '#2492c2'
const app_name = 'DivergeRest'
const atentamente = 'Jhuler Aguirre'
const correo = 'jhuler.aguirre@gmail.com'
const whatsapp = '+51 987 076 972'
const derechos = `© ${dayjs().format('YYYY')} ${app_name}, todos los derechos reservados.`

function comprobanteHtml(numero, empresa_nombre) {
    return `
    <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');

                *{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
                    border: none;
                    outline: none;
                    color: #3C3C3B;
                    font-size: 15px;
                }

                section{
                    width: 100%;
                    background-color: whitesmoke;
                    padding: 1rem;
                }

                article{
                    background-color: white;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    margin: 0 auto;
                    width: 35rem;
                }

                h1{
                    text-align: center;
                    font-size: 2rem;
                }

                footer{
                    text-align: center;
                    margin: 0 auto;
                    margin-top: 2rem;
                    width: 35rem;
                }

                footer p{
                    margin-top: 0.5rem;
                    font-size: 0.8rem;
                }

                .container-mensaje{
                    margin: 2rem 2rem 0 2rem;
                }

                .container-mensaje strong, .container-mensaje p{
                    font-size: 1.2rem;
                    word-spacing: 3px;
                    line-height: 1.4;
                }

                .resaltado{
                    color: ${primary_color};
                }
                
            </style>
        </head>

        <body>
            <section>
                <article>
                    <h1>${app_name}</h1>

                    <div class="container-mensaje">
                        <p>Estimado cliente,</p>
                        <p>
                            Te enviamos la factura <strong class="resaltado">${numero}</strong> correspondiente a tus consumos recientes en ${empresa_nombre}.
                        </p>
                        <p>
                            La encontrarás adjunta en formato PDF en este correo.
                        </p>
                    </div>
                </article>

                <footer>
                    <p>Atentamente <br>${atentamente}</p>
                    
                    <p>
                        Comunicate con nosotros por los siguientes medios:
                        <br>Correo: ${correo}
                        <br>WhatsApp: ${whatsapp}
                    </p>

                    <p>${derechos}</p>
                </footer>
            </section>
        </body>
    </html>
    `
}

export { comprobanteHtml }