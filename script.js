const TOKEN = "patZLW6DeVrBvuzm1.d6ebc2f78383cf0452f18d573f94817afa7bc3696d8d69394a894d576c3d6efd";
const BASE = "appdV7iObspvoiWpq";
const TABLA = "DB_MercanciaJM";

function validarAcceso() {
    if(document.getElementById('passInput').value === "admin123") {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('mainFooter').classList.remove('hidden');
        cargar();
    } else {
        alert("Contraseña incorrecta");
    }
}

function calcResta() {
    const p = parseFloat(document.getElementById('pre').value) || 0;
    const a = parseFloat(document.getElementById('abo').value) || 0;
    document.getElementById('valRes').value = "$" + (p - a).toLocaleString('es-CO');
}

async function cargar() {
    try {
        const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLA}?sort%5B0%5D%5Bfield%5D=Cliente&sort%5B0%5D%5Bdirection%5D=asc`, { 
            headers: { Authorization: `Bearer ${TOKEN}` } 
        });
        const data = await res.json();
        window.datosCompletos = data.records;
        const tbody = document.getElementById('lista');
        tbody.innerHTML = "";
        data.records.forEach(r => {
            const f = r.fields;
            const saldo = (f.Precio || 0) - (f.Abono || 0);
            const tr = document.createElement('tr');
            tr.className = saldo <= 0 ? "pago-ok" : "pago-deuda";
            tr.innerHTML = `
                <td class="text-start"><strong>${f.Cliente}</strong></td>
                <td>${f.Producto}</td>
                <td>$${(f.Abono || 0).toLocaleString('es-CO')}</td>
                <td class="fw-bold">$${saldo.toLocaleString('es-CO')}</td>
                <td>
                    <div class="btn-group">
                        <button onclick='enviarWhatsApp(${JSON.stringify(r)})' class="btn btn-success btn-sm"><i class="bi bi-whatsapp"></i></button>
                        <button onclick='imprimirFacturaNativa(${JSON.stringify(r.fields)})' class="btn btn-info btn-sm text-white"><i class="bi bi-printer"></i></button>
                        <button onclick='editar(${JSON.stringify(r)})' class="btn btn-warning btn-sm mx-1"><i class="bi bi-pencil"></i></button>
                        <button onclick='borrar("${r.id}")' class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
}

// FUNCIÓN ACTUALIZADA: Genera descarga directa para evitar errores en el móvil
function imprimirFacturaNativa(f) {
    const saldo = (f.Precio || 0) - (f.Abono || 0);
    const fecha = new Date().toLocaleDateString();
    
    // Crear el diseño del ticket
    const ticketHtml = `
        <div style="font-family:monospace; padding:20px; width:300px; color:black; background:white;">
            <h2 style="text-align:center; margin:0;">J&M MERCANCÍA</h2>
            <p style="text-align:center; font-size:12px;">Comprobante de Pago</p>
            <hr style="border:none; border-top:1px dashed black;">
            <p><strong>FECHA:</strong> ${fecha}</p>
            <p><strong>CLIENTE:</strong> ${f.Cliente}</p>
            <p><strong>PRODUCTO:</strong> ${f.Producto}</p>
            <hr style="border:none; border-top:1px dashed black;">
            <p>TOTAL: $${(f.Precio || 0).toLocaleString('es-CO')}</p>
            <p>ABONO: $${(f.Abono || 0).toLocaleString('es-CO')}</p>
            <hr style="border:none; border-top:1px dashed black;">
            <p style="font-size:18px;"><b>SALDO: $${saldo.toLocaleString('es-CO')}</b></p>
            <p style="text-align:center; font-size:10px; margin-top:20px;">¡Gracias por su compra!</p>
        </div>
    `;

    const elemento = document.createElement('div');
    elemento.innerHTML = ticketHtml;

    // Configuración de descarga directa
    const opciones = {
        margin: 0.2,
        filename: `Factura_${f.Cliente}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, logging: false, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Usar la librería html2pdf para descargar el archivo sin abrir ventanas nuevas
    html2pdf().set(opciones).from(elemento).save();
}

document.getElementById('formM').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const campos = {
        "Cliente": document.getElementById('cli').value,
        "Telefono": document.getElementById('tel').value,
        "Direccion": document.getElementById('dir').value,
        "Producto": document.getElementById('pro').value,
        "Precio": parseFloat(document.getElementById('pre').value),
        "Abono": parseFloat(document.getElementById('abo').value),
        "MetodoPago": document.getElementById('metodo').value
    };
    try {
        await fetch(id ? `https://api.airtable.com/v0/${BASE}/${TABLA}/${id}` : `https://api.airtable.com/v0/${BASE}/${TABLA}`, {
            method: id ? 'PATCH' : 'POST',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: campos })
        });
        if (!id) imprimirFacturaNativa(campos);
        resetForm(); cargar();
    } catch(err) { alert("Error al guardar"); }
});

function enviarWhatsApp(r) {
    const f = r.fields;
    const saldo = (f.Precio || 0) - (f.Abono || 0);
    const msj = `Hola *${f.Cliente}*, J&M Mercancía le informa su saldo de *${f.Producto}*: *$${saldo.toLocaleString('es-CO')}*.`;
    window.open(`https://wa.me/57${(f.Telefono || '').replace(/\D/g,'')}?text=${encodeURIComponent(msj)}`, '_blank');
}

function descargarReporte() {
    if (!window.datosCompletos) return;
    let csv = "\ufeffCliente;Telefono;Producto;Precio;Abono;Saldo\n";
    window.datosCompletos.forEach(r => {
        const f = r.fields;
        csv += `"${f.Cliente}";"${f.Telefono || ''}";"${f.Producto}";"${f.Precio}";"${f.Abono}";"${f.Precio-f.Abono}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Reporte_JM.csv`; a.click();
}

function editar(r) {
    const f = r.fields;
    document.getElementById('editId').value = r.id;
    document.getElementById('cli').value = f.Cliente;
    document.getElementById('tel').value = f.Telefono || "";
    document.getElementById('dir').value = f.Direccion || "";
    document.getElementById('pro').value = f.Producto;
    document.getElementById('pre').value = f.Precio;
    document.getElementById('abo').value = f.Abono;
    document.getElementById('metodo').value = f.MetodoPago || "Efectivo";
    calcResta();
    document.getElementById('btnG').innerText = "Actualizar";
    document.getElementById('btnCan').classList.remove('d-none');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function resetForm() {
    document.getElementById('formM').reset();
    document.getElementById('editId').value = "";
    document.getElementById('btnG').innerText = "Guardar Datos";
    document.getElementById('btnCan').classList.add('d-none');
    calcResta();
}

async function borrar(id) { 
    if(confirm("¿Eliminar?")) { 
        await fetch(`https://api.airtable.com/v0/${BASE}/${TABLA}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } }); 
        cargar(); 
    } 
}

function filtrar() {
    const val = document.getElementById('searchInput').value.toUpperCase();
    document.querySelectorAll('#lista tr').forEach(tr => tr.style.display = tr.innerText.toUpperCase().includes(val) ? "" : "none");
}
