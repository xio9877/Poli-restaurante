# Plan sencillo de commits

Primero se sube el **backend (API)**. Cuando esté listo, se sube el **frontend (página web)**. Cada persona trabaja en sus cinco funcionalidades y usa su propia cuenta de GitHub.

| Persona | 5 funcionalidades para backend y frontend |
|---|---|
| **A — Diego (`devghozt-code`)** | 1. Inicio de sesión y autenticación<br>2. Usuarios y roles<br>3. Mesas<br>4. Dashboard<br>5. Reportes |
| **B — Xiomara** | 1. Categorías<br>2. Productos<br>3. Órdenes<br>4. Detalles e historial de órdenes<br>5. Cocina y preparación de pedidos |
| **C — Felipe** | 1. Clientes y direcciones<br>2. Órdenes en mesa<br>3. Domicilios<br>4. Facturación<br>5. Pagos |

## Orden de trabajo

1. **Backend:** cada persona implementa y prueba sus cinco funcionalidades de API. Se integran primero los cambios de Diego, después los de Xiomara y luego los de Felipe.
2. **Frontend:** con las APIs listas, cada persona implementa y prueba las cinco pantallas o flujos correspondientes. Se integran en el mismo orden.
3. Antes de integrar cada grupo, se ejecutan las compilaciones y las pruebas relacionadas.

## Commits y cuentas

- Hacer commits pequeños, con mensajes claros, por ejemplo: `feat(api): agregar reportes de ventas` y `feat(frontend): mostrar reportes de ventas`.
- Cada integrante configura su propia clave SSH en su cuenta de GitHub y sube los commits que realmente realizó.
- No compartir claves privadas ni atribuir commits a otra persona. Si una funcionalidad fue trabajo compartido, reconocer a sus colaboradores en el commit o en el PR.
