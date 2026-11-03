# Concejo Inteligente Montenegro

Plataforma web del **Concejo Municipal de Montenegro (Quindío)** para organizar el trabajo de la corporación y mostrarle a la ciudadanía qué hace su Concejo.

## Autor

**William Andrés Muriel**, consultor en finanzas públicas territoriales y administración pública.
*Gobierno | Territorio | Tecnología*

- LinkedIn: [linkedin.com/in/willi-muriel](https://www.linkedin.com/in/willi-muriel)
- Blog: [elpoderdetrasdelpoder.lovable.app](https://elpoderdetrasdelpoder.lovable.app)

© 2026 William Andrés Muriel. Todos los derechos reservados sobre el diseño y el código de la plataforma.

## Qué incluye

| Módulo | Para qué sirve |
|---|---|
| **Inicio** | Próxima sesión con cuenta regresiva, enlace a la transmisión y botón para agregarla al calendario. Para la Secretaría, además, **alertas de plazos**. |
| **Sesiones** | Se pueden ver como lista, por período, por instancia, por proyecto, por continuaciones o por control político. Programación, asistencia con cálculo de quórum, orden del día (art. 57), votaciones nominales, proposiciones, compromisos, ciudadanos inscritos para intervenir, **convocatoria en Word** y **acta en Word** con marca de aprobación. |
| **Proyectos de acuerdo** | **Ruta del proyecto** con calendario: dónde va, fechas reales, plazos de ley y fechas estimadas, y los posibles desvíos (objeción, archivo, apelación). **Cómo votó cada concejal** en cada debate, con observaciones y aclaraciones de voto. Filtros por estado, comisión y concejal. Resumen en lenguaje ciudadano. |
| **Control político** | **Citaciones** con cuestionario, control del plazo de 5 días y **citación en Word**. Seguimiento de **compromisos**. |
| **Participa** | La ciudadanía se **inscribe para intervenir** en una sesión o **propone temas** de control político. Los datos solo los ve la Secretaría (Ley 1581 de 2012). |
| **Honorarios** | Asistencia del mes por concejal, sesiones pagables con control de topes anuales (70 ordinarias y 20 extraordinarias, art. 66 de la Ley 136), valor a pagar, **anexo de la resolución en Word** y **certificados de asistencia**. |
| **Observatorio** | Asistencia, ponencias, proposiciones, citaciones y votos por concejal. Se publica solo si la Secretaría lo activa. |
| **Conoce tu Concejo** | Recinto en 3D: curules por partido y comisión, mesa directiva, Secretaría General, banderas y vistas del municipio, con la ficha de cada concejal. |
| **Ajustes** | Mesa directiva, comisiones (cupos 4 / 4 / 5), valor de honorarios por sesión, enlace de transmisión y publicación del Observatorio. |

**Alertas automáticas:**
- Segundo debate.
- Plazo para pasar el proyecto al alcalde (5 días hábiles, art. 76 de la Ley 136).
- Plazo del alcalde para objetar: 5, 10 o 20 días según el número de artículos (art. 78 de la Ley 136).
- Citaciones por enviar.
- Actas sin aprobar.
- Compromisos vencidos.
- Topes de sesiones.
- Fin del período ordinario y opción de prórroga.
- Riesgo de archivo, publicación en la Gaceta (10 días), objeciones y apelaciones.

Las reglas (quórum, mayorías, orden del día, plazos) siguen el **Reglamento Interno del Concejo, Acuerdo 018 de 2012, reformado por el Acuerdo 001 de 2013**.

Cualquier persona puede consultar la información. Solo los correos autorizados de la Secretaría pueden registrar.

## Puesta en marcha

### 1. Base de datos (Supabase, plan gratuito)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (región: São Paulo o la más cercana).
2. En **SQL Editor**, pega todo el archivo [`supabase/esquema.sql`](supabase/esquema.sql) y toca **Run**.
3. En **Authentication → Users → Add user**, crea el usuario de la Secretaría con correo y contraseña.
4. Autoriza ese correo como editor. En **SQL Editor** ejecuta:
   ```sql
   insert into public.editores (email) values ('correo-de-la-secretaria@ejemplo.com');
   ```
5. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**, para que nadie más pueda crear cuentas.
6. En **Project Settings → API**, copia la **Project URL** y la clave **anon public**.

### 2. Configuración

Edita [`config.js`](config.js) y pega los dos valores:

```js
window.CONCEJO_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseAnonKey: "eyJ..."
};
```

La clave *anon* es pública por diseño. Lo que protege los datos son las reglas del esquema: todos leen y solo los editores escriben.

### 3. Publicación (GitHub Pages)

En el repositorio: **Settings → Pages → Branch: `main` / carpeta `/ (root)` → Save**. En uno o dos minutos la plataforma queda en:

`https://willz8207.github.io/concejo-inteligente-montenegro/`

## Uso diario

- **Ingresar:** botón **Ingreso Secretaría**, en la barra lateral.
- **Registrar una sesión:**
  1. **Sesiones → Programar sesión**.
  2. Marca la **asistencia**.
  3. Haz las **votaciones**.
  4. **Cierra la sesión**.
  5. Descarga el **acta**.
- **Registrar ponencias:** se radica el proyecto en **Proyectos de acuerdo** y se escoge el ponente.
- **Honorarios del mes:**
  1. Ve a **Honorarios** y escoge el mes.
  2. Toca **Descargar anexo**.
  3. El certificado de cada concejal sale con el botón de su fila.
- **Antes de usarlo:** en **Ajustes**, escribe el valor de honorarios por sesión que corresponde a la categoría del municipio en el año.
- **Datos de ejemplo:** en **Ajustes** se pueden cargar ejemplos para una demostración. Quedan marcados como **EJEMPLO** y se borran con un clic.

## Estructura

```
index.html          Aplicación (sin dependencias de compilación)
recinto.js          Recinto 3D (Three.js)
config.js           Conexión a Supabase
img/                Logo, banderas y fotos del municipio
supabase/esquema.sql  Tablas y reglas de seguridad
```

## Pendiente por cargar

- Fotos y hojas de vida de los concejales (en `index.html`, lista `CONCEJALES`).
- Mesa directiva del año y comisiones (desde **Ajustes**).

## Créditos de las imágenes

- Logo del Concejo y bandera de Montenegro: Concejo Municipal de Montenegro.
- *Mirador del Parque Nacional del Café*: Luis Rafael Martínez Angulo, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), Wikimedia Commons.
- *Estación del Ferrocarril de Montenegro*: Jhon James Gutiérrez Gil, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), Wikimedia Commons.
- *Teleférico del Parque del Café*: ACHETORRES, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Wikimedia Commons.
- *Atardecer en Montenegro*: Juan Pablo Galvis Franco, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Wikimedia Commons.
- Logos de los partidos políticos: aportados por el autor del proyecto; pertenecen a cada partido y se usan solo para identificar la bancada de cada concejal.
- Parroquia San José y letrero «Yo ❤ Montenegro»: fotos aportadas por el autor del proyecto.
