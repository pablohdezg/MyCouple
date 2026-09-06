# 💞 MyCouple

Una app para parejas. Privada, bonita y offline: todo lo que guardáis vive en
vuestro móvil, sin cuentas, sin anuncios y sin que ningún servidor lea nada.

Está pensada para el día a día real de una pareja: recordar, planear, hablar y
jugar. En español y con cinco temas de color.

---

## Índice

1. [Qué trae la app](#qué-trae-la-app)
2. [Cómo conseguir el APK](#cómo-conseguir-el-apk)
3. [Probarla ahora mismo (sin APK)](#probarla-ahora-mismo-sin-apk)
4. [Sincronizar los dos móviles](#sincronizar-los-dos-móviles)
5. [Privacidad](#privacidad)
6. [Cómo está hecha](#cómo-está-hecha)
7. [En qué me basé](#en-qué-me-basé)

---

## Qué trae la app

### Inicio
- **Contador de días juntos** con el desglose exacto (años, meses y días).
- **Próximo hito**: 100 días, 1000 días, cada aniversario… con barra de progreso.
- **"Pensando en ti"**: 12 avisos rápidos que le llegan al otro y quedan en el chat.
- **Nota para el otro**: cada uno puede dejar una nota escrita a mano que aparece
  en la portada de su pareja hasta que le escriba otra. Si aún no hay ninguna, se
  muestra una frase distinta cada día.
- **Foto de perfil**: cada persona puede poner una foto suya en lugar del emoji,
  desde el primer paso de la app o tocando su foto en Ajustes.
- **Mesaniversario**: la portada avisa cuando cumplís meses (según el día del
  mes de vuestro aniversario) y, si hoy no toca, cuenta los días que faltan.
- **Racha de pareja 🔥**: cuenta los días seguidos en que los dos habéis
  abierto la app, para tener una excusa más para no dejar pasar el día.
- Resumen del día: pregunta pendiente, ánimo de los dos, lo que viene, mini mapa.

### Nuestro muro
- Publicaciones con texto y foto, comentarios y seis reacciones.
- Un diario compartido que se va poniendo mejor con el tiempo.

### Chat privado
- Conversación entre los dos, con stickers y mensajes rápidos.
- **Notas de voz** con onda y reproducción dentro de la burbuja.
- **Fotos y vídeos**, incluido el modo **"ver una vez"**: se borra para siempre en
  cuanto se abre (tanto del móvil como del almacenamiento compartido).
- **Pizarra**: dibújale algo a mano con siete colores y tres grosores, y se lo mandas.
- **Borrar mensajes** (desaparecen para los dos).
- **Reacciones**: doble toque en un mensaje para dejarle un ❤️ (una por persona).
- **Doble check azul**: ✓ cuando se envía, ✓✓ en cuanto la otra persona abre el chat.
- Notificación en el móvil cuando llega algo nuevo de la otra persona (mientras la
  app esté abierta o en segundo plano; ver la nota sobre notificaciones más abajo).
- Separadores por día y marca de hora.

### Dónde estamos (mapa en tiempo real)
- **Está en la barra de abajo**, a un toque desde cualquier parte, y además aparece
  un mini mapa en la portada con los dos y la distancia.
- **Sigue funcionando con la app cerrada de verdad**: un servicio propio de
  Android (`LocationSharingService.java`, escrito a medida, sin librerías
  externas) mantiene la posición actualizada cada pocos minutos. Mientras está
  activo se ve una notificación fija: Android la exige, y es justo lo que impide
  que el sistema mate el seguimiento.
- **El servicio sube la posición él solo.** Antes se la pasaba a la parte web
  para que la subiera, así que en cuanto Android se llevaba por delante la
  ventana de la app (o la cerrabas del todo), el móvil seguía tomando posiciones
  que ya no llegaban a ninguna parte. Ahora habla directamente con Supabase, sin
  depender de que la app esté viva.
- **Revive solo**: al encender el móvil, al actualizar la app y si el sistema
  mata el servicio, vuelve a arrancar por su cuenta. Antes había que abrir la
  app a mano después de cada reinicio.
- **La hora de cada posición se manda siempre.** Esto arregla el fallo por el
  que la ubicación parecía funcionar pero se quedaba congelada en el primer
  sitio: al guardar una posición nueva sólo se actualizan los datos que van en
  el envío, y la hora no iba, así que se quedaba para siempre con la de la
  primera vez. Al otro móvil le llegaban posiciones nuevas con fecha vieja y
  las descartaba todas por "más antiguas que la que ya tengo". Ahora cada
  aviso lleva su hora y el mapa se mueve de verdad.
- **Aviso de "quita la optimización de batería"**: casi todos los móviles cierran
  las apps que llevan un rato sin usarse. La pantalla del mapa detecta si tu
  móvil lo tiene puesto y ofrece arreglarlo en un toque. Sin ese permiso, el
  seguimiento se corta a las pocas horas por mucho servicio que haya.
- Sólo avisa si te has movido más de 50 metros, y como mucho una vez por minuto,
  así que apenas gasta batería ni datos.
- **Llegadas y salidas**: cuando la otra persona entra o sale de uno de vuestros
  lugares guardados, te llega una notificación ("Leo ha llegado · Está en 🏡
  Casa"). Lo comprueba el móvil que recibe, no el que se mueve, así que funciona
  aunque el otro tenga la app cerrada del todo.
- **Batería de la otra persona**: se ve junto a su posición, y si baja del 15 %
  te avisa ("Leo se queda sin batería, le queda un 9 %"), para saber por qué
  igual tarda en contestar.
- Para que la posición llegue al otro móvil hace falta tener la sincronización
  configurada (ver más abajo). Si no, la app lo avisa en la propia pantalla.
- **Mapa de verdad**, con Leaflet y teselas de **OpenStreetMap**: cubre el mundo
  entero, se arrastra y se hace zoom como cualquier mapa. **No hace falta ninguna
  clave de API ni cuenta de Google**: OpenStreetMap es libre y gratuito. La
  librería va empotrada en la app (no se descarga de ningún CDN), así que dentro
  del APK funciona igual.
- Tres vistas: **mapa, satélite** (imágenes de Esri) y **noche**. Si un servidor
  no responde, cambia solo al siguiente.
- Cada uno aparece con su símbolo, unido al otro por una línea de puntos, y su
  chincheta late suavemente.
- **Distancia entre los dos** con frase según la distancia («en el mismo barrio»,
  «un vuelo os separa»), tiempo estimado andando / en coche / en avión y rumbo
  («Leo está al noreste»).
- **Hora local de cada uno**, calculada por su longitud: útil a distancia.
- **Vuestros lugares**: guarda casa, el trabajo o vuestro bar y la app dice
  «Ana está en casa» en vez de unas coordenadas.
- **Recuerdos en el mapa**: cada foto puede llevar su sitio y se ve como chincheta.
- Botón para **abrir la posición del otro en Google Maps** y que te lleve hasta allí.
- Compartir es siempre voluntario, se pide confirmación, se puede parar en un toque
  y al pararlo se borra la posición.

> **¿Y Google Maps?** Su API necesita una clave con facturación activada y cobra
> por uso a partir de cierto volumen. OpenStreetMap da exactamente el mismo mapa
> mundial sin registrarse ni pagar, así que la app lo usa por defecto y deja el
> botón de «abrir en Google Maps» para cuando queráis navegar hasta allí.

### Vales de amor
- Promesas canjeables con forma de ticket: un masaje, elegir la peli, desayuno en
  la cama. Catorce ideas listas para regalar en un toque.
- Quien lo recibe lo canjea cuando quiere; queda sellado como «canjeado».

### Hacer las paces
- Guía corta para después de una discusión, con la lógica de los *intentos de
  reparación*: primero parar, hablar de uno mismo, reconocer la parte propia y
  pedir algo concreto.
- Cada uno escribe cómo se siente, qué necesita y su parte; se ven las dos y se
  cierra con un «hemos hecho las paces».
- Ocho frases que desarman, listas para copiar.

### Nuestro año en resumen
- El *wrapped* de la pareja, al estilo Spotify Wrapped: mensajes, palabras
  escritas, recuerdos, citas, deseos cumplidos, notas de voz, dibujos, vales,
  gratitudes y noches.
- Gráfica del mes más vuestro, vuestro día más feliz, la mejor cita del año, la
  foto del año y vuestra reacción favorita. Se puede compartir.
- **Llega solo cada año**: en cuanto empieza un año nuevo, la portada muestra
  un aviso de que el resumen del año que acaba de terminar ya está listo (y,
  si tenéis las notificaciones activadas, también os llega un aviso). No hace
  falta acordarse de ir a buscarlo.

### Agenda
- Calendario mensual con puntos en los días ocupados.
- Eventos, citas, cumpleaños, viajes y recordatorios; repetición anual.
- Aniversario, cumpleaños y hitos se añaden solos.
- **Notificaciones locales**: aviso el día antes a las 20:00 y el mismo día a las 9:00.

### Pregunta del día
- **260 preguntas** cuidadas, una por día, siempre la misma para los dos.
- La respuesta del otro se desbloquea cuando los dos habéis contestado.
- Racha de días seguidos e historial completo.
- No se repite ninguna hasta que no hayáis pasado por las 260.

### Recuerdos
- Álbum de fotos **y vídeos** con fecha, lugar, álbumes y favoritos.
- Las fotos se redimensionan solas y se guardan en IndexedDB; con sincronización
  activada, también viajan al móvil del otro (igual que en el chat).
- **Comentarios** en cada recuerdo, para revivirlo juntos.

### Lista de deseos
- Todo lo que queréis hacer, por categorías, con progreso y fecha de cumplimiento.
- Sugerencias para arrancar.

### Ideas de citas
- **178 planes** con filtros: en casa / fuera, gratis, de noche, aventura,
  **deporte**, creativo, a distancia…
- **Ruleta** para decidir sin discutir, y guardado de las citas con nota y estrellas.
- **Citas sorpresa 🎁**: al guardar una cita podéis marcarla como sorpresa —
  el plan queda oculto para el otro (sólo ve "os ha preparado una sorpresa")
  hasta que llegue el día, para que la sorpresa no se estropee mirando la app.

### Minijuegos
Un apartado propio con dos juegos rápidos, pensados para jugar a distancia
sin depender de una conexión en tiempo real:

**Wordle en pareja**
- La misma palabra secreta de 5 letras cada día para los dos, con el mismo
  criterio de colores del Wordle original (verde/naranja/gris) y 6 intentos.
- Cuando los dos la jugáis, se ve cuántos intentos os costó a cada uno.

**Enlaza letras** (al estilo Boggle/Ruzzle)
- Cuadrícula de letras configurable (4×4, 5×5 o 6×6) y tiempo configurable
  (60/90/120/180 segundos): arrastrad el dedo por letras vecinas (también en
  diagonal) para formar palabras de 3 o más letras.
- **Los dos tenéis que uniros a la partida antes de que nadie pueda jugar**:
  quien la crea espera a que el otro la abra y toque "Unirme". Así nadie
  juega solo sin que el otro se entere.
- **Empezáis a la vez de verdad**: cuando ya estáis los dos dentro, uno pulsa
  "Empezar la partida" y sale una cuenta atrás en los dos móviles. A partir
  de ahí el reloj no es de cada uno por su cuenta, sino la hora real
  compartida: la partida acaba en el mismo instante para los dos aunque uno
  entre unos segundos más tarde, se le vaya la cobertura o cierre y vuelva a
  abrir la app. Por eso tampoco hay forma de terminar antes de tiempo: eso
  rompería que los dos tengáis exactamente los mismos segundos.
- Al encontrar una palabra aparece un aviso grande en pantalla; si repetís
  una ya encontrada avisa de que ya la teníais, y si no es una palabra real
  dice que no existe.
- Al crear una partida, le llega una **notificación de invitación** a la otra
  persona (mientras tenga las notificaciones activadas y la app abierta o en
  segundo plano reciente — la misma limitación que el resto de avisos de la
  app, explicada más abajo).
- La misma cuadrícula es para los dos: cada uno la juega por su cuenta y
  luego se comparan las palabras encontradas con un **recuento animado**,
  al estilo podio de dos columnas que van subiendo palabra a palabra (en
  orden mezclado a propósito, para que no se sepa el resultado hasta la
  última). Puntuación: **1 punto** por cada palabra que hayáis encontrado
  los dos, **2 puntos** por cada una que sólo haya encontrado uno.
- El diccionario (17.000 palabras comunes en español) vive en la propia app,
  sin conexión a internet.

### Juegos
- Seis mazos: **Verdad** (74), **Reto** (75), **¿Qué prefieres?** (67),
  **Yo nunca** (60), **Preguntas profundas** (60) e **Íntimas** (60, opcional,
  atrevido de verdad y bajo confirmación de los dos).
- **No se repiten**: cada mazo prioriza las cartas que no hayáis visto
  todavía; sólo empieza a repetir cuando ya os las sabéis todas.
- **Sorpréndeme**: una carta al azar de entre todos los mazos que tengáis
  desbloqueados, para no elegir mazo cuando no os apetece pensar.
- **Añadir vuestras propias cartas** a cualquier mazo: se mezclan con las demás
  la próxima vez que juguéis y se sincronizan entre los dos móviles.
- Turnos alternos y barajado.

### Cómo estamos
- Ánimo y energía diarios con etiquetas y nota; se ve el del otro.
- Histórico de dos semanas.
- **Check-in semanal** estilo terapia de pareja: conexión, comunicación,
  intimidad, algo que agradezco y algo que necesito. Se revela cuando los dos
  responden.

### Lenguajes del amor
- Test de 25 preguntas con resultados en porcentaje para cada uno.
- Consejos concretos para querer mejor a la otra persona según su lenguaje.

### Y además
- **Cartas al futuro**: se escriben hoy, se abren en la fecha que elijáis (antes
  aparecen borrosas y bloqueadas).
- **Hoy hace un año**: en la portada aparecen los recuerdos y momentos del mismo
  día de años anteriores.
- **Ritual de buenas noches**: a partir de las 20:00, un botón para despediros,
  con racha de noches seguidas. **Se reinicia cada día**, y la "noche" no
  termina a las 00:00 sino a las 05:00: si os dais las buenas noches a la una
  y media de la madrugada, cuenta como la noche anterior y no como haberos
  saltado un día. Al día siguiente el botón vuelve a estar disponible.
- **Gratitud**: una nota al día sobre el otro, con sugerencias rotativas.
- **Cuentas atrás**: viajes, reencuentros, lo que estéis esperando.
- **Listas**: la compra, pelis, series, libros, restaurantes, canciones, viajes,
  regalos y recetas. La lista de **regalos** tiene un truco: podéis reservar en
  secreto un deseo del otro para comprarlo, y esa marca se le oculta a quien lo
  pidió, para que la sorpresa siga intacta.
- **Tareas del hogar**: reparto, repeticiones automáticas y marcador.
- **Gastos compartidos**: quién pagó, reparto ajustable, balance y "saldar cuentas".
- **26 logros** con estadísticas de la pareja.
- **Ajustes**: 5 temas + modo noche, bloqueo con PIN, foto de perfil, copia de
  seguridad y sincronización.

---

## El diseño

- Estética de papel suave: fondo cálido con degradado, tarjetas redondeadas y
  sombras muy suaves.
- Tipografía serif para los titulares y de sistema para el resto, sin descargar
  nada: se ve igual sin conexión.
- **Cinco paletas** (rubor, atardecer, lavanda, menta, cielo) × modo noche,
  todas definidas con las mismas variables CSS.
- Emoji como lenguaje visual, que es lo que le da el tono a una app de pareja.

---

## Cómo conseguir el APK

> El proyecto está listo para compilar. Elige la vía que más te convenga.

### Opción A — GitHub Actions (recomendada, sin instalar nada)

1. Crea un repositorio en GitHub y sube esta carpeta.
2. Entra en la pestaña **Actions** del repositorio.
3. Elige el flujo **"Construir APK"** → botón **Run workflow**.
4. Cuando termine (unos 5 minutos), abre la ejecución y descarga el artefacto
   **`nuestro-rincon-apk`**. Dentro está el `.apk`.
5. Pásalo al móvil y ábrelo. Android pedirá permitir "instalar apps de esta
   fuente": es normal en apps que no vienen de la Play Store.

El flujo ya está escrito en `.github/workflows/android.yml`.

### Opción B — Android Studio (en tu ordenador)

```bash
npm install
npm run android:open      # compila, sincroniza y abre Android Studio
```

En Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
El archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

### Opción C — Línea de comandos

Necesitas el SDK de Android instalado y la variable `ANDROID_HOME` apuntando a él.

```bash
npm install
npm run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Para una versión firmada de release:

```bash
cd android
keytool -genkeypair -v -keystore release.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias nuestrorincon
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$PWD/release.jks \
  -Pandroid.injected.signing.store.password=TU_CLAVE \
  -Pandroid.injected.signing.key.alias=nuestrorincon \
  -Pandroid.injected.signing.key.password=TU_CLAVE
```

> **Por qué no viene el APK ya hecho:** el entorno donde se ha desarrollado tiene
> bloqueado el acceso a `dl.google.com`, que es de donde se descargan el SDK de
> Android y el plugin de Gradle. Sin ellos no se puede compilar aquí. Todo lo
> demás (el proyecto Android completo, los iconos, el splash y el flujo de CI)
> está hecho y verificado.

---

## Notificaciones

Android exige el permiso de notificaciones explícitamente (a partir de la
versión 13). La app lo pide **una sola vez**, justo al terminar de configurarla
la primera vez que se abre. Si ya tenías la app instalada de antes de esto,
ve a **Ajustes → Notificaciones**, apágalo y vuelve a encenderlo: esa acción es
la que dispara la pregunta de permiso.

Cubre: recordatorios de la agenda (cumpleaños, aniversario, eventos) y avisos
cuando llega algo nuevo del otro en el chat. Este último caso tiene un límite
real que conviene conocer: como no hay un servidor de por medio (todo es
local-first), sólo puede avisar mientras la app sigue viva en el móvil —
abierta o en segundo plano reciente —, no con el proceso totalmente cerrado.
Un aviso de verdad con la app cerrada del todo necesitaría un pequeño servidor
push (Firebase Cloud Messaging), que es una pieza de infraestructura aparte y
no está incluida.

---

## Widgets de la pantalla de inicio

La app trae cuatro widgets nativos de Android:

- **Días juntos**: el contador y cuándo cumplís el próximo mesaniversario.
- **Distancia**: cuánto os separa y hacia dónde, calculado con las últimas
  posiciones que os hayáis compartido (no es un mapa en miniatura, es el
  resumen en texto de "dónde estamos" — un mapa interactivo de verdad dentro
  de un widget no es algo que Android permita de forma fiable).
- **Recuerdo**: la foto más reciente de vuestro álbum con su frase.
- **Carrusel de recuerdos**: hasta 10 fotos de vuestro álbum que van
  cambiando solas. Un widget no puede animar una transición de verdad, así
  que avanza de dos formas: sola, cada vez que Android lo refresca (como
  mucho cada 30 minutos, el mínimo que deja el sistema), y al toque, tocando
  la foto pasa a la siguiente al momento. El corazoncito de la esquina abre
  la app.

Para añadirlos: mantén el dedo en un hueco vacío de la pantalla de inicio →
**Widgets** → buscad "MyCouple" → arrastrad el que queráis.

**Se pueden redimensionar.** Los cuatro admiten que los estiréis o los
encojáis: manteniendo el dedo sobre el widget ya colocado salen los tiradores
para arrastrar los bordes. Cada uno declara un tamaño mínimo pequeño, así que
podéis dejarlos ocupando poco si tenéis la pantalla llena. El de **días
juntos** en concreto se ha rehecho para que sea compacto — el número y la
palabra "días juntos" van en la misma línea, en vez del bloque enorme de
antes — y el de **distancia** es ahora una tira horizontal con vuestras dos
fotos superpuestas y los kilómetros al lado. Los textos se recortan con
puntos suspensivos en vez de descuadrar el widget cuando lo dejáis pequeño.

Se actualizan solos cada vez que abrís la app (y como mucho cada 30 minutos
en segundo plano, que es el límite que impone Android). La primera vez que
instaléis esta versión, abrid la app al menos una vez antes de añadir los
widgets, para que tengan datos que mostrar.

> Los widgets son 100% nativos (viven en el proyecto Android, no en la web
> empotrada), así que si más adelante activáis lo de actualizar sin
> recompilar, un cambio futuro en los widgets sí seguirá necesitando un APK
> nuevo — igual que cualquier otro cambio nativo.

---

## Actualizar la app sin generar un APK nuevo cada vez

Por defecto el APK lleva la web empotrada dentro: fiable y funciona sin
conexión desde el primer segundo, pero cualquier cambio de código pide un APK
nuevo — como habéis estado haciendo hasta ahora.

Hay una alternativa **opcional**, usando una función oficial de Capacitor (no
un plugin externo sin garantías): en vez de la web empotrada, el APK puede
cargarla desde una dirección publicada en internet. A partir de ahí, publicar
un cambio es sólo actualizar esa web — el móvil coge la versión nueva la
siguiente vez que abra la app con conexión, sin instalar nada.

Cómo activarlo (una sola vez):

1. En GitHub: **Settings → Pages → Source → GitHub Actions** (una vez, para
   todo el repositorio).
2. Cada `git push` ya dispara `.github/workflows/pages.yml`, que publica la web
   en `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.
3. Antes del **próximo** `npx cap sync android` (el único paso que hace falta
   repetir por terminal, y sólo esta vez), define esa URL:
   - Windows (PowerShell): `$env:CAP_REMOTE_URL="https://TU-USUARIO.github.io/TU-REPOSITORIO/"`
   - Mac/Linux: `export CAP_REMOTE_URL="https://TU-USUARIO.github.io/TU-REPOSITORIO/"`
4. `npx cap sync android` y genera el APK una última vez con Android Studio.

A partir de ese momento, cualquier cambio de contenido o de pantallas sólo
necesita subirse a GitHub: no hace falta ni terminal ni Android Studio. Un
cambio **nativo** (un permiso nuevo, un plugin Java como el de la ubicación en
segundo plano) sigue necesitando un APK nuevo, porque eso vive en el propio
APK y no en la web.

Si no quieres complicarte con esto, no pasa nada: sáltatelo y sigue generando
el APK como hasta ahora. Es opcional del todo.

### Pasos exactos para instalar esta actualización

**Importante:** esto todavía no está activado (nadie ha hecho el paso único de
arriba todavía), así que esta tanda de cambios **no** le llega sola al móvil de
tu novia: hay que instalar el APK nuevo en los dos móviles, uno por uno.

1. Descarga el proyecto actualizado (el `.zip` que te he pasado) y descomprímelo
   sustituyendo la carpeta anterior.
2. Abre la carpeta `android` con Android Studio (**File → Open**).
3. Espera a que termine de sincronizar Gradle (la barra de abajo).
4. **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
5. Cuando acabe, pulsa **locate** en el aviso, o busca el archivo en
   `android/app/build/outputs/apk/debug/app-debug.apk`.
6. Pásate ese `.apk` a tu móvil (por cable, Drive, WhatsApp a ti mismo…) y
   ábrelo para instalarlo encima de la versión anterior — no hace falta
   desinstalar nada, los datos se mantienen.
7. Repite el paso 6 en el móvil de tu novia con el mismo `.apk`.

Si en algún momento activáis lo de arriba (Capacitor + GitHub Pages), a partir
de ese momento un `git push` le llegará solo a los dos móviles sin repetir
estos pasos — pero eso hay que dejarlo montado una vez, con un APK más que
instalar en los dos móviles.

---

## Probarla ahora mismo (sin APK)

> Para ver el mapa hace falta conexión a internet y un navegador normal: abre el
> archivo `nuestro-rincon.html` desde el móvil o usa el APK. Algunas vistas
> previas incrustadas bloquean las imágenes externas y ahí el mapa se queda en
> «sin conexión».

La app también es una PWA instalable:

```bash
npm install
npm run dev          # http://localhost:5173
```

O con la versión ya compilada:

```bash
npm run build
npm run preview      # accesible también desde el móvil en la misma wifi
```

Desde Chrome en Android: menú **⋮ → Añadir a pantalla de inicio**. Se instala
como una app normal, con su icono y sin barra del navegador.

---

## Sincronizar los dos móviles

Por defecto **no hay servidor**: cada móvil guarda sus datos. Es lo más privado,
pero significa que no veis lo que escribe el otro.

Si queréis que los dos veáis lo mismo, la app trae una sincronización opcional y
gratuita con Supabase:

1. Cuenta gratis en [supabase.com](https://supabase.com) → nuevo proyecto.
2. **SQL Editor** → pegar el contenido de [`supabase.sql`](./supabase.sql) → Run.
3. **Project Settings → API** → copiar la **Project URL** y la clave de la sección
   **Publishable key** (en paneles antiguos de Supabase se sigue llamando
   *anon public*; es la misma clave, solo cambió el nombre). Empieza por
   `sb_publishable_...` o por `eyJ...` según cuándo se creó el proyecto.
4. En la app: **Ajustes → Sincronización → Configurar**, pegar los dos valores y
   escribir **el mismo código de pareja** en los dos móviles.

Cómo funciona: cada 25 segundos (y al abrir la app) se descarga el estado del
otro, se fusiona por marca de tiempo elemento a elemento y se vuelve a subir.
Funciona aunque uno de los dos esté sin cobertura: cuando vuelva, se pone al día.

**Fotos, vídeos, notas de voz y dibujos también se sincronizan**, pero por un
camino distinto: van a **Supabase Storage** (el almacén de archivos del mismo
proyecto), en vez de meterse dentro del JSON de la tabla `pares`. El SQL de
`supabase.sql` crea ese almacén (`media`) además de la tabla. Cada archivo se
guarda con vuestro código de pareja delante de la ruta, así que sólo quien
conozca el código llega a ellos.

Aquí había un fallo silencioso ya arreglado: las **fotos del muro** y las
**fotos de perfil** se guardaban sólo en el móvil que las elegía y nunca se
subían, así que el otro veía la publicación pero con un hueco donde debía ir
la foto, o el emoji de siempre en vez de la cara. Ahora suben como el resto.
Las fotos de perfil que pusisteis *antes* de configurar la sincronización
también se suben solas la primera vez que abráis esta versión.

Si alguna vez ya habíais ejecutado una versión antigua de `supabase.sql` (sin
la parte de Storage), volved a pegarlo y ejecutarlo: es seguro repetirlo,
sólo añade lo que falta.

> ⚠️ **Hay que volver a ejecutar `supabase.sql`** para que la ubicación
> funcione con la app cerrada. Añade una tabla nueva y diminuta,
> `ubicaciones`, que es la que escribe el servicio de Android por su cuenta.
> ¿Por qué una tabla aparte? Porque en `pares` vive todo el estado de la app
> en un único JSON: subir eso entero cada pocos minutos desde un servicio en
> segundo plano gastaría muchísimos datos y podría pisar cambios del otro
> móvil. Aquí cada aviso son cuatro números.
>
> Mientras no la creéis, la app sigue funcionando igual que antes (no se rompe
> nada), pero la ubicación sólo se actualizará con la app abierta. Si le dais
> a **Ajustes → Probar conexión**, os avisa de que falta.

---

## Privacidad

- Sin cuentas, sin registro, sin analítica, sin anuncios, sin rastreadores.
- Los datos viven en `localStorage` y las fotos en IndexedDB, dentro del móvil.
- Bloqueo con PIN de 4 cifras opcional.
- Copia de seguridad exportable a un `.json` que sólo tenéis vosotros.
- La sincronización es opcional y va a *vuestro* proyecto de Supabase, no a
  ningún servidor mío.
- El mazo de cartas íntimas está desactivado por defecto y pide confirmación.

---

## Cómo está hecha

- **React 19 + TypeScript + Vite**, sin framework de UI: CSS propio con tokens y
  cinco paletas + modo noche.
- **Capacitor 8** para empaquetar como app nativa de Android.
- Estado global con Context + persistencia en `localStorage` (guardado con
  *debounce*), fotos en IndexedDB vía `idb-keyval`.
- Router propio basado en hash (funciona igual en web y dentro del WebView, y
  respeta el botón "atrás" de Android).
- Sincronización con la API REST de Supabase mediante `fetch`, sin dependencias.
- **Pensada para móviles justitos.** Las pantallas se cargan por separado, sólo
  cuando entráis en ellas (`React.lazy`), en vez de meterlo todo en el primer
  arranque: el paquete inicial pasó de 759 KB a 348 KB, menos de la mitad. Lo
  más pesado (el mapa con Leaflet y el diccionario de 17.000 palabras) queda
  fuera del arranque y sólo baja quien abre el mapa o el juego de letras.
  Además, las operaciones que antes tocaban el estado una vez por elemento
  (marcar los mensajes como vistos al abrir el chat, saldar todos los gastos)
  ahora se hacen de una sola vez, que era lo que hacía que se quedara pillada
  unos segundos en conversaciones largas.

```
src/
  components/ui.tsx     Botones, tarjetas, hojas, campos, avatares…
  data/                 Preguntas, ideas de citas, mazos, test, logros
  lib/                  Fechas, medios, hápticos, notificaciones, sync
  screens/              Las 29 pantallas
  store/                Estado global, derivaciones y fusión de datos
assets/                 Icono en SVG (fuente de todos los tamaños)
scripts/                Generador de iconos y splash
android/                Proyecto Android listo para compilar
```

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y compila a `dist/` |
| `npm run lint` | Linter |
| `npm run assets` | Regenera iconos y splash desde `assets/icon.svg` |
| `npm run android:sync` | Compila y copia todo al proyecto Android |
| `npm run android:apk` | Genera el APK de depuración |

Para cambiar el nombre o el identificador de la app: `capacitor.config.ts`
(`appName` y `appId`), y después `npx cap sync android`.

---

## En qué me basé

Antes de escribir nada revisé qué ofrecen las apps de referencia del sector y
qué funciones se repiten en las comparativas de 2026, para no dejarme nada
importante:

- **Paired** — preguntas diarias y biblioteca de conversación.
- **Cupla** — calendario compartido, listas, tareas y planificador de citas.
- **Between** — mensajería privada, álbum y línea de tiempo de la pareja.
- **Lovewick** — ideas de citas, notas de amor, cuestionarios e hitos.
- **Love Nudge** — los 5 lenguajes del amor.
- **Honeydue** — finanzas compartidas.
- **Amora / Coupl / Lovio** — contador de días, rachas, widgets y foto del día.
- **Lasting / Gottman** — check-in semanal y mazos de preguntas profundas.

De ahí salió la lista de funciones: contador y hitos, pregunta del día con
revelado mutuo, muro y chat, álbum, calendario con recordatorios, lista de
deseos, ruleta de citas, listas compartidas, tareas, gastos, ánimo diario,
check-in semanal, lenguajes del amor, juegos de cartas, cartas al futuro,
gratitud, cuentas atrás, logros y personalización.

Fuentes consultadas:

- [13 Best Couples Apps in 2026 — Emira](https://emira.io/articles/best-couples-apps)
- [7 Best Couple Apps in 2026 — Habi](https://habi.app/insights/best-couple-apps/)
- [9 Best Couples Apps in 2026 — Connected](https://www.connectedcouples.app/blog/best-couples-apps-2026)
- [11 Mejores Apps para Parejas en 2026 — Amora](https://tryamora.app/blog/best-apps-for-couples-2026)
- [Features — Connected Couples App](https://www.connectedcouples.app/features)
- [Coupl: Love Tracker & Widgets — App Store](https://apps.apple.com/us/app/coupl-love-tracker-widgets/id6758527369)

---

Hecho con 💗 para que lo uséis los dos.
