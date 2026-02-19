import { login, logout, getSession } from "./auth.js";
import { supabase } from "./supabase.js";

console.log("main.js cargado - Versión completa OFICIAL para Hacienda");

// Variable global para almacenar las facturas actuales
let facturasActuales = [];
let paginaActual = 1;
const FACTURAS_POR_PAGINA = 25;

/* =========================
   PERFIL FISCAL (NUEVO)
========================= */

// Función para verificar si el perfil fiscal está completo
async function verificarPerfilFiscal(session) {
  try {
    const { data, error } = await supabase
      .from("perfil_fiscal")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return {
        completo: false,
        perfil: null,
        mensaje: "Debes completar tu perfil fiscal antes de exportar libros oficiales"
      };
    }

    // Verificar campos obligatorios
    if (!data.nombre_razon_social || !data.nif) {
      return {
        completo: false,
        perfil: data,
        mensaje: "Faltan campos obligatorios en tu perfil fiscal (nombre y NIF)"
      };
    }

    return {
      completo: true,
      perfil: data
    };
  } catch (error) {
    console.error("Error verificando perfil fiscal:", error);
    return {
      completo: false,
      perfil: null,
      mensaje: "Error al verificar perfil fiscal"
    };
  }
}

// Función para mostrar/editar perfil fiscal
function mostrarModalPerfilFiscal(perfil, onSave) {
  const modalHTML = `
    <div id="modalPerfilFiscal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    ">
      <div style="
        background: white;
        padding: 32px;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h2 style="margin:0;font-size:20px;color:#111827;">📋 Perfil Fiscal</h2>
          <button onclick="document.getElementById('modalPerfilFiscal').remove()" style="
            background:none;
            border:none;
            font-size:24px;
            cursor:pointer;
            color:#6b7280;
          ">×</button>
        </div>
        
        <p style="color:#6b7280;margin-bottom:20px;font-size:14px;">
          Estos datos aparecerán en tus libros oficiales (requisito legal).
        </p>
        
        <form id="formPerfilFiscal">
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              Nombre o Razón Social *
            </label>
            <input 
              type="text" 
              id="nombrePerfil" 
              value="${perfil?.nombre_razon_social || ''}" 
              placeholder="Ej: Juan Pérez López"
              required
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              NIF/NIE/CIF *
            </label>
            <input 
              type="text" 
              id="nifPerfil" 
              value="${perfil?.nif || ''}" 
              placeholder="Ej: 12345678A"
              required
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              Actividad (Epígrafe IAE o descripción)
            </label>
            <input 
              type="text" 
              id="actividadPerfil" 
              value="${perfil?.actividad || ''}" 
              placeholder="Ej: Desarrollo software, Consultoría informática"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              Domicilio Fiscal
            </label>
            <textarea 
              id="domicilioPerfil" 
              placeholder="Ej: Calle Principal 123, 28001 Madrid"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;min-height:80px;"
            >${perfil?.domicilio_fiscal || ''}</textarea>
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              Teléfono
            </label>
            <input 
              type="tel" 
              id="telefonoPerfil" 
              value="${perfil?.telefono || ''}" 
              placeholder="Ej: 612345678"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              Email
            </label>
            <input 
              type="email" 
              id="emailPerfil" 
              value="${perfil?.email || ''}" 
              placeholder="Ej: info@tudominio.com"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
          </div>
          
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button 
              type="button" 
              onclick="document.getElementById('modalPerfilFiscal').remove()"
              style="
                padding:10px 20px;
                border:1px solid #d1d5db;
                background:white;
                border-radius:8px;
                color:#374151;
                cursor:pointer;
              "
            >
              Cancelar
            </button>
            <button 
              type="submit"
              style="
                padding:10px 20px;
                border:none;
                background:#2563eb;
                color:white;
                border-radius:8px;
                font-weight:600;
                cursor:pointer;
              "
            >
              Guardar perfil fiscal
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Insertar modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Manejar envío del formulario
  document.getElementById('formPerfilFiscal').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombrePerfil').value.trim();
    const nif = document.getElementById('nifPerfil').value.trim();
    const actividad = document.getElementById('actividadPerfil').value.trim();
    const domicilio = document.getElementById('domicilioPerfil').value.trim();
    const telefono = document.getElementById('telefonoPerfil').value.trim();
    const email = document.getElementById('emailPerfil').value.trim();

    if (!nombre || !nif) {
      alert('Los campos marcados con * son obligatorios');
      return;
    }

    const session = await getSession();
    if (!session) return;

    // Guardar perfil
    const { error } = await supabase
  .from('perfil_fiscal')
  .upsert(
    {
      user_id: session.user.id,
      nombre_razon_social: nombre,
      nif: nif,
      actividad: actividad,
      domicilio_fiscal: domicilio,
      telefono: telefono,
      email: email,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );


    if (error) {
      console.error('Error guardando perfil:', error);
      alert('Error al guardar el perfil');
      return;
    }

    // Cerrar modal y ejecutar callback
    document.getElementById('modalPerfilFiscal').remove();
    if (onSave) onSave();
    
    alert('✅ Perfil fiscal guardado correctamente');
  });
}

/* =========================
   FUNCIONES DE CÁLCULO ALTERNATIVAS (si las RPC fallan)
========================= */

// Función alternativa para calcular IVA trimestral
async function calcularIVATrimestralDirecto(session, year, trimestre) {
  try {
    const trimestreMap = {
      T1: ["01-01", "03-31"],
      T2: ["04-01", "06-30"],
      T3: ["07-01", "09-30"],
      T4: ["10-01", "12-31"],
    };

    const [inicio, fin] = trimestreMap[trimestre];
    const fechaInicio = `${year}-${inicio}`;
    const fechaFin = `${year}-${fin}`;

    // Obtener todas las facturas del trimestre
    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) throw error;

    let ivaRepercutido = 0;  // Facturas emitidas (IVA que cobro a clientes)
    let ivaSoportado = 0;    // Facturas recibidas (IVA que pago a proveedores)

    facturas?.forEach(factura => {
      const ivaMonto = (factura.base * factura.iva) / 100;
      
      if (factura.tipo === "emitida") {
        ivaRepercutido += ivaMonto;
      } else if (factura.tipo === "recibida") {
        ivaSoportado += ivaMonto;
      }
    });

    const resultado = ivaRepercutido - ivaSoportado;

    return {
      iva_repercutido: ivaRepercutido,
      iva_soportado: ivaSoportado,
      resultado: resultado
    };
  } catch (error) {
    console.error("Error en calcularIVATrimestralDirecto:", error);
    return { iva_repercutido: 0, iva_soportado: 0, resultado: 0 };
  }
}

// Función alternativa para calcular IRPF trimestral
async function calcularIRPFTrimestralDirecto(session, year, trimestre) {
  try {
    const trimestreMap = {
      T1: ["01-01", "03-31"],
      T2: ["04-01", "06-30"],
      T3: ["07-01", "09-30"],
      T4: ["10-01", "12-31"],
    };

    const [inicio, fin] = trimestreMap[trimestre];
    const fechaInicio = `${year}-${inicio}`;
    const fechaFin = `${year}-${fin}`;

    // Obtener todas las facturas del trimestre
    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) throw error;

    let ingresos = 0;  // Base de facturas emitidas
    let gastos = 0;    // Base de facturas recibidas

    facturas?.forEach(factura => {
      if (factura.tipo === "emitida") {
        ingresos += factura.base;
      } else if (factura.tipo === "recibida") {
        gastos += factura.base;
      }
    });

    const rendimiento = ingresos - gastos;
    const irpf = rendimiento * 0.20;  // 20% de IRPF para autónomos

    return {
      ingresos: ingresos,
      gastos: gastos,
      rendimiento: rendimiento,
      irpf: irpf
    };
  } catch (error) {
    console.error("Error en calcularIRPFTrimestralDirecto:", error);
    return { ingresos: 0, gastos: 0, rendimiento: 0, irpf: 0 };
  }
}

// Función alternativa para calcular IVA anual
async function calcularIVAAnualDirecto(session, year) {
  try {
    const fechaInicio = `${year}-01-01`;
    const fechaFin = `${year}-12-31`;

    // Obtener todas las facturas del año
    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) throw error;

    let ivaRepercutidoTotal = 0;
    let ivaSoportadoTotal = 0;

    facturas?.forEach(factura => {
      const ivaMonto = (factura.base * factura.iva) / 100;
      
      if (factura.tipo === "emitida") {
        ivaRepercutidoTotal += ivaMonto;
      } else if (factura.tipo === "recibida") {
        ivaSoportadoTotal += ivaMonto;
      }
    });

    const resultadoAnual = ivaRepercutidoTotal - ivaSoportadoTotal;

    return { resultado: resultadoAnual };
  } catch (error) {
    console.error("Error en calcularIVAAnualDirecto:", error);
    return { resultado: 0 };
  }
}

// Función alternativa para calcular IRPF anual
async function calcularIRPFAnualDirecto(session, year) {
  try {
    const fechaInicio = `${year}-01-01`;
    const fechaFin = `${year}-12-31`;

    // Obtener todas las facturas del año
    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) throw error;

    let ingresosAnual = 0;
    let gastosAnual = 0;

    facturas?.forEach(factura => {
      if (factura.tipo === "emitida") {
        ingresosAnual += factura.base;
      } else if (factura.tipo === "recibida") {
        gastosAnual += factura.base;
      }
    });

    const rendimientoAnual = ingresosAnual - gastosAnual;
    const irpfAnual = rendimientoAnual * 0.20;  // 20% de IRPF

    return { irpf: irpfAnual };
  } catch (error) {
    console.error("Error en calcularIRPFAnualDirecto:", error);
    return { irpf: 0 };
  }
}

/* =========================
   LIBRO DE INGRESOS (solo del trimestre seleccionado)
========================= */
async function cargarLibroIngresos(libroIngresosBody, session, year, trimestre) {
  if (!libroIngresosBody || !session) return;

  try {
    const trimestreMap = {
      T1: ["01-01", "03-31"],
      T2: ["04-01", "06-30"],
      T3: ["07-01", "09-30"],
      T4: ["10-01", "12-31"],
    };

    const [inicio, fin] = trimestreMap[trimestre];
    const fechaInicio = `${year}-${inicio}`;
    const fechaFin = `${year}-${fin}`;

    const { data: ingresos, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("tipo", "emitida")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error cargando libro de ingresos:", error);
      return;
    }

    libroIngresosBody.innerHTML = "";

    if (!ingresos || ingresos.length === 0) {
      libroIngresosBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">
            No hay ingresos en ${trimestre} de ${year}
          </td>
        </tr>
      `;
      return;
    }

    ingresos.forEach((f) => {
      const total = f.base + (f.base * f.iva) / 100;

      libroIngresosBody.innerHTML += `
        <tr>
          <td>${f.fecha}</td>
          <td>${f.numero_factura || 'Borrador'}</td>
          <td>${f.concepto}</td>
          <td>${f.base.toFixed(2)} €</td>
          <td>${total.toFixed(2)} €</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error en cargarLibroIngresos:", error);
    libroIngresosBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;color:#ef4444;">
          Error cargando datos
        </td>
      </tr>
    `;
  }
}

/* =========================
   LIBRO DE GASTOS (solo del trimestre seleccionado)
========================= */
async function cargarLibroGastos(libroGastosBody, session, year, trimestre) {
  if (!libroGastosBody || !session) return;

  try {
    const trimestreMap = {
      T1: ["01-01", "03-31"],
      T2: ["04-01", "06-30"],
      T3: ["07-01", "09-30"],
      T4: ["10-01", "12-31"],
    };

    const [inicio, fin] = trimestreMap[trimestre];
    const fechaInicio = `${year}-${inicio}`;
    const fechaFin = `${year}-${fin}`;

    const { data: gastos, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("tipo", "recibida")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error cargando libro de gastos:", error);
      return;
    }

    libroGastosBody.innerHTML = "";

    if (!gastos || gastos.length === 0) {
      libroGastosBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">
            No hay gastos en ${trimestre} de ${year}
          </td>
        </tr>
      `;
      return;
    }

    gastos.forEach((f) => {
      const total = f.base + (f.base * f.iva) / 100;

      libroGastosBody.innerHTML += `
        <tr>
          <td>${f.fecha}</td>
          <td>${f.concepto}</td>
          <td>${f.base.toFixed(2)} €</td>
          <td>${f.iva}%</td>
          <td>${total.toFixed(2)} €</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error en cargarLibroGastos:", error);
    libroGastosBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;color:#ef4444;">
          Error cargando datos
        </td>
      </tr>
    `;
  }
}

/* =========================
   IVA TRIMESTRAL + DEGRADADO (con fallback)
========================= */
async function cargarIVA(session, year, trimestre, ivaRepercutidoEl, ivaSoportadoEl, ivaResultadoEl, ivaEstadoEl) {
  console.log("Cargando IVA para:", year, trimestre);
  
  try {
    // Intentar primero con la RPC
    const { data, error } = await supabase.rpc("iva_trimestral", {
      uid: session.user.id,
      year_int: Number(year),
      trimestre_txt: trimestre,
    });

    let iva;

    if (error || !data || data.length === 0) {
      console.log("RPC falló, usando cálculo directo:", error?.message);
      // Usar cálculo directo si la RPC falla
      iva = await calcularIVATrimestralDirecto(session, year, trimestre);
    } else {
      iva = data[0];
    }

    console.log("Datos IVA obtenidos:", iva);

    ivaRepercutidoEl.textContent = iva.iva_repercutido?.toFixed(2) || "0.00" + " €";
    ivaSoportadoEl.textContent = iva.iva_soportado?.toFixed(2) || "0.00" + " €";
    ivaResultadoEl.textContent = iva.resultado?.toFixed(2) || "0.00" + " €";

    const resultado = iva.resultado || 0;
    ivaEstadoEl.textContent = resultado > 0 ? "A pagar" : "A compensar";
    ivaEstadoEl.style.color = resultado > 0 ? "#b91c1c" : "#15803d";

    const card = ivaResultadoEl.closest(".metric-card");
    card.classList.remove("fiscal-ok", "fiscal-warning");
    card.classList.add(resultado > 0 ? "fiscal-warning" : "fiscal-ok");
  } catch (error) {
    console.error("Error en cargarIVA:", error);
    // Valores por defecto en caso de error
    ivaRepercutidoEl.textContent = "0.00 €";
    ivaSoportadoEl.textContent = "0.00 €";
    ivaResultadoEl.textContent = "0.00 €";
    ivaEstadoEl.textContent = "Error";
  }
}

/* =========================
   IRPF TRIMESTRAL + DEGRADADO (con fallback)
========================= */
async function cargarIRPF(session, year, trimestre, irpfIngresosEl, irpfGastosEl, irpfResultadoEl) {
  console.log("Cargando IRPF para:", year, trimestre);
  
  try {
    // Intentar primero con la RPC
    const { data, error } = await supabase.rpc("irpf_trimestral", {
      uid: session.user.id,
      year_int: Number(year),
      trimestre_txt: trimestre,
    });

    let irpf;

    if (error || !data || data.length === 0) {
      console.log("RPC falló, usando cálculo directo:", error?.message);
      // Usar cálculo directo si la RPC falla
      irpf = await calcularIRPFTrimestralDirecto(session, year, trimestre);
    } else {
      irpf = data[0];
    }

    console.log("Datos IRPF obtenidos:", irpf);

    irpfIngresosEl.textContent = irpf.ingresos?.toFixed(2) || "0.00" + " €";
    irpfGastosEl.textContent = irpf.gastos?.toFixed(2) || "0.00" + " €";
    irpfResultadoEl.textContent = irpf.irpf?.toFixed(2) || "0.00" + " €";

    const card = irpfResultadoEl.closest(".metric-card");
    card.classList.add("fiscal-irpf");
  } catch (error) {
    console.error("Error en cargarIRPF:", error);
    // Valores por defecto en caso de error
    irpfIngresosEl.textContent = "0.00 €";
    irpfGastosEl.textContent = "0.00 €";
    irpfResultadoEl.textContent = "0.00 €";
  }
}

/* =========================
   RESUMEN ANUAL (con fallback)
========================= */
async function cargarResumenAnual(session, year, ivaAnualEl, irpfAnualEl, resultadoAnualEl) {
  console.log("Cargando resumen anual para:", year);
  
  try {
    let iva, irpf;

    // Intentar IVA anual con RPC
    const { data: ivaData, error: ivaError } = await supabase.rpc("iva_anual", {
      uid: session.user.id,
      year_int: Number(year),
    });

    if (ivaError || !ivaData || ivaData.length === 0) {
      console.log("RPC IVA anual falló, usando cálculo directo");
      iva = await calcularIVAAnualDirecto(session, year);
    } else {
      iva = ivaData[0];
    }

    // Intentar IRPF anual con RPC
    const { data: irpfData, error: irpfError } = await supabase.rpc("irpf_anual", {
      uid: session.user.id,
      year_int: Number(year),
    });

    if (irpfError || !irpfData || irpfData.length === 0) {
      console.log("RPC IRPF anual falló, usando cálculo directo");
      irpf = await calcularIRPFAnualDirecto(session, year);
    } else {
      irpf = irpfData[0];
    }

    const total = (iva.resultado || 0) + (irpf.irpf || 0);

    console.log("Resumen anual - IVA:", iva.resultado, "IRPF:", irpf.irpf, "Total:", total);

    ivaAnualEl.textContent = (iva.resultado || 0).toFixed(2) + " €";
    irpfAnualEl.textContent = (irpf.irpf || 0).toFixed(2) + " €";
    resultadoAnualEl.textContent = total.toFixed(2) + " €";
  } catch (error) {
    console.error("Error en cargarResumenAnual:", error);
    // Valores por defecto
    ivaAnualEl.textContent = "0.00 €";
    irpfAnualEl.textContent = "0.00 €";
    resultadoAnualEl.textContent = "0.00 €";
  }
}

/* =========================
   HISTÓRICO IVA (solo del año seleccionado)
========================= */
async function cargarIvaHistorico(session, ivaHistoricoBody, year) {
  if (!session || !ivaHistoricoBody) return;

  try {
    // Intentar con RPC primero
    const { data, error } = await supabase.rpc("iva_historico", {
      uid: session.user.id,
    });

    ivaHistoricoBody.innerHTML = "";

    if (error || !data || data.length === 0) {
      console.log("RPC histórico IVA falló, mostrando vacío");
      ivaHistoricoBody.innerHTML = "<tr><td colspan='5'>No hay datos históricos para este año</td></tr>";
      return;
    }

    // Filtrar por el año seleccionado
    const datosFiltrados = data.filter(row => row.year === year);
    
    if (datosFiltrados.length === 0) {
      ivaHistoricoBody.innerHTML = "<tr><td colspan='5'>No hay datos para este año</td></tr>";
      return;
    }

    datosFiltrados.forEach((row) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${row.trimestre}</td>
        <td>${(row.iva_repercutido || 0).toFixed(2)} €</td>
        <td>${(row.iva_soportado || 0).toFixed(2)} €</td>
        <td>${(row.resultado || 0).toFixed(2)} €</td>
      `;

      ivaHistoricoBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error en cargarIvaHistorico:", error);
    ivaHistoricoBody.innerHTML = "<tr><td colspan='5'>Error cargando datos</td></tr>";
  }
}

/* =========================
   HISTÓRICO IRPF (solo del año seleccionado)
========================= */
async function cargarIrpfHistorico(session, irpfHistoricoBody, year) {
  if (!session || !irpfHistoricoBody) return;

  try {
    // Intentar con RPC primero
    const { data, error } = await supabase.rpc("irpf_historico", {
      uid: session.user.id,
    });

    irpfHistoricoBody.innerHTML = "";

    if (error || !data || data.length === 0) {
      console.log("RPC histórico IRPF falló, mostrando vacío");
      irpfHistoricoBody.innerHTML = "<tr><td colspan='6'>No hay datos históricos para este año</td></tr>";
      return;
    }

    // Filtrar por el año seleccionado
    const datosFiltrados = data.filter(row => row.year === year);
    
    if (datosFiltrados.length === 0) {
      irpfHistoricoBody.innerHTML = "<tr><td colspan='6'>No hay datos para este año</td></tr>";
      return;
    }

    datosFiltrados.forEach((row) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${row.trimestre}</td>
        <td>${(row.ingresos || 0).toFixed(2)} €</td>
        <td>${(row.gastos || 0).toFixed(2)} €</td>
        <td>${(row.rendimiento || 0).toFixed(2)} €</td>
        <td>${(row.irpf || 0).toFixed(2)} €</td>
      `;

      irpfHistoricoBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error en cargarIrpfHistorico:", error);
    irpfHistoricoBody.innerHTML = "<tr><td colspan='6'>Error cargando datos</td></tr>";
  }
}

/* =========================
   EMITIR FACTURA (NUMERACIÓN LEGAL) - CORREGIDA
========================= */
async function emitirFactura(facturaId, userId) {
  try {
    // Primero obtener la factura para saber su fecha
    const { data: factura, error: errorFactura } = await supabase
      .from("facturas")
      .select("*")
      .eq("id", facturaId)
      .single();

    if (errorFactura || !factura) {
      throw new Error("No se pudo encontrar la factura");
    }

    // Usar el año de la factura, no el año actual
    const fechaFactura = new Date(factura.fecha);
    const serie = fechaFactura.getFullYear().toString();

    console.log("Emisión de factura:", {
      facturaId: facturaId,
      fechaFactura: factura.fecha,
      serie: serie
    });

    // Buscar o crear la serie para este año
    let { data: serieData } = await supabase
      .from("factura_series")
      .select("*")
      .eq("user_id", userId)
      .eq("serie", serie)
      .single();

    if (!serieData) {
      console.log("Creando nueva serie para el año:", serie);
      const { data: nuevaSerie, error: errorSerie } = await supabase
        .from("factura_series")
        .insert({
          user_id: userId,
          serie,
          ultimo_numero: 0,
        })
        .select()
        .single();

      if (errorSerie) throw errorSerie;
      serieData = nuevaSerie;
    }

    const siguienteNumero = serieData.ultimo_numero + 1;
    const numeroFactura = `${serie}-${String(siguienteNumero).padStart(4, "0")}`;

    console.log("Número de factura generado:", numeroFactura);

    // Actualizar la factura con el número generado
    const { error: facturaError } = await supabase
      .from("facturas")
      .update({
        numero_factura: numeroFactura,
        serie,
        estado: "emitida",
        fecha_emision: new Date().toISOString().slice(0, 10), // Fecha de emisión actual
      })
      .eq("id", facturaId)
      .eq("estado", "borrador");

    if (facturaError) throw facturaError;

    // Actualizar el contador de la serie
    const { error: serieError } = await supabase
      .from("factura_series")
      .update({ ultimo_numero: siguienteNumero })
      .eq("id", serieData.id);

    if (serieError) throw serieError;

    return numeroFactura;
  } catch (error) {
    console.error("Error en emitirFactura:", error);
    throw error;
  }
}

/* =========================
   COMPROBAR SI EL TRIMESTRE ESTÁ CERRADO
========================= */
async function trimestreEstaCerrado(userId, year, trimestre) {
  const { data, error } = await supabase
    .from("cierres_trimestrales")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("trimestre", trimestre);

  if (error) {
    console.error(error);
    return false;
  }

  return data.length > 0;
}

/* =========================
   FUNCIÓN PARA OBTENER FACTURAS EMITIDAS OFICIALES (NUEVA)
========================= */
async function obtenerFacturasEmitidasOficiales(session, year, trimestre) {
  const trimestreMap = {
    T1: ["01-01", "03-31"],
    T2: ["04-01", "06-30"],
    T3: ["07-01", "09-30"],
    T4: ["10-01", "12-31"],
  };

  const [inicio, fin] = trimestreMap[trimestre];
  const fechaInicio = `${year}-${inicio}`;
  const fechaFin = `${year}-${fin}`;

  // SOLO facturas emitidas con número (oficiales)
  const { data, error } = await supabase
    .from("facturas")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("tipo", "emitida")
    .eq("estado", "emitida")
    .not("numero_factura", "is", null)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error obteniendo facturas oficiales:", error);
    return [];
  }

  return data || [];
}

/* =========================
   FUNCIÓN PARA EXPORTAR LIBRO DE INGRESOS OFICIAL (NUEVA)
========================= */
async function exportarLibroIngresosOficial(session, year, trimestre) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Error: jsPDF no está cargado");
    return;
  }

  // Obtener facturas emitidas oficiales
  const facturasOficiales = await obtenerFacturasEmitidasOficiales(session, year, trimestre);
  
  // Obtener perfil fiscal
  const { data: perfil } = await supabase
    .from("perfil_fiscal")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = 20;

    // ============================================
    // 1. ENCABEZADO OBLIGATORIO (ART. 68 REGLAMENTO IRPF)
    // ============================================
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LIBRO REGISTRO DE INGRESOS", pageWidth / 2, y, { align: "center" });
    
    y += 10;
    
    // Datos del contribuyente
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Titular: ${perfil.nombre_razon_social}`, margin, y);
    y += 6;
    doc.text(`NIF: ${perfil.nif}`, margin, y);
    y += 6;
    
    if (perfil.actividad) {
      doc.text(`Actividad: ${perfil.actividad}`, margin, y);
      y += 6;
    }
    
    if (perfil.domicilio_fiscal) {
      doc.text(`Domicilio fiscal: ${perfil.domicilio_fiscal}`, margin, y);
      y += 6;
    }
    
    // Periodo
    doc.setFont("helvetica", "bold");
    doc.text(`Periodo: Trimestre ${trimestre} - Año ${year}`, margin, y);
    y += 6;
    
    // Fecha generación
    const fechaActual = new Date().toLocaleDateString('es-ES');
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de generación: ${fechaActual}`, margin, y);
    
    y += 15;
    
    // ============================================
    // 2. RESUMEN DEL PERIODO
    // ============================================
    if (facturasOficiales.length === 0) {
      // No hay facturas emitidas en el periodo
      doc.setFontSize(12);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("No existen facturas emitidas en este periodo", pageWidth / 2, y, { align: "center" });
      y += 10;
    } else {
      // Calcular totales
      let totalBase = 0;
      let totalIVA = 0;
      let totalIngresos = 0;
      
      facturasOficiales.forEach(f => {
        totalBase += f.base;
        const ivaMonto = (f.base * f.iva) / 100;
        totalIVA += ivaMonto;
        totalIngresos += f.base + ivaMonto;
      });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DEL PERIODO", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Número de facturas emitidas: ${facturasOficiales.length}`, margin, y);
      y += 6;
      doc.text(`Base imponible total: ${totalBase.toFixed(2)} €`, margin, y);
      y += 6;
      doc.text(`IVA repercutido total: ${totalIVA.toFixed(2)} €`, margin, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`Total ingresos: ${totalIngresos.toFixed(2)} €`, margin, y);
      
      y += 15;

      // ============================================
      // 3. TABLA DE FACTURAS EMITIDAS (OFICIAL)
      // ============================================
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE FACTURAS EMITIDAS", margin, y);
      y += 10;

      // Encabezado de tabla
      doc.setFillColor(41, 99, 235);
      doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      
      let xPos = margin;
      // Ajustamos anchos porque ahora hay más columnas
const columnWidths = [18, 24, 28, 22, 18, 14, 22, 22];


const headers = [
  "Fecha",
  "Nº Factura",
  "Cliente",
  "NIF",
  "Base",
  "IVA %",
  "Cuota IVA",
  "Total"
];

      
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, y + 7);
        xPos += columnWidths[index];
      });
      
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Datos de la tabla
let rowIndex = 0;
facturasOficiales.forEach((f) => {

  // Calcular cuota IVA y total
  const cuotaIVA = (f.base * f.iva) / 100;
  const total = f.base + cuotaIVA;

  // Color de fondo alternado
  if (rowIndex % 2 === 0) {
    doc.setFillColor(245, 247, 251);
  } else {
    doc.setFillColor(255, 255, 255);
  }
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');

  // Contenido de la fila
  xPos = margin;

  // Fecha
  doc.text(f.fecha, xPos + 2, y + 6);
  xPos += columnWidths[0];

  // Número de factura
  doc.text(f.numero_factura || "Sin número", xPos + 2, y + 6);
  xPos += columnWidths[1];

  // Cliente
  doc.text(f.cliente_nombre || "-", xPos + 2, y + 6);
  xPos += columnWidths[2];

  // NIF
  doc.text(f.cliente_nif || "-", xPos + 2, y + 6);
  xPos += columnWidths[3];

  // Base
  doc.text(`${f.base.toFixed(2)} €`, xPos + 2, y + 6);
  xPos += columnWidths[4];

  // IVA %
  doc.text(`${f.iva}%`, xPos + 2, y + 6);
  xPos += columnWidths[5];

  // Cuota IVA
  doc.text(`${cuotaIVA.toFixed(2)} €`, xPos + 2, y + 6);
  xPos += columnWidths[6];

  // Total
  doc.text(`${total.toFixed(2)} €`, xPos + 2, y + 6);

  y += 8;
  rowIndex++;

  // Nueva página si es necesario
  if (y > 270) {
    doc.addPage();
    y = 20;

    doc.setFillColor(41, 99, 235);
    doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");

    xPos = margin;
    headers.forEach((header, idx) => {
      doc.text(header, xPos + 2, y + 7);
      xPos += columnWidths[idx];
    });

    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }
});

      
      y += 15;

      // ============================================
      // 4. INFORMACIÓN FISCAL ORIENTATIVA
      // ============================================
      if (facturasOficiales.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("INFORMACIÓN FISCAL (orientativa)", margin, y);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`• IVA a declarar (Modelo 303): ${totalIVA.toFixed(2)} €`, margin, y + 8);
        doc.text(`• IRPF a pagar (Modelo 130): ${(totalBase * 0.20).toFixed(2)} €`, margin, y + 16);
        y += 30;
      }
    }

    // ============================================
    // 5. TEXTO LEGAL FINAL (IMPORTANTE)
    // ============================================
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    
    const textoLegal = [
      "Este libro registro se genera automáticamente a partir de las facturas emitidas",
      "por el contribuyente y cumple con lo dispuesto en el artículo 68 del Reglamento",
      "del IRPF.",
      "",
      "Este documento no sustituye la obligación de presentación de los modelos",
      "tributarios correspondientes ante la Agencia Tributaria."
    ];
    
    textoLegal.forEach((linea, index) => {
      doc.text(linea, pageWidth / 2, y + (index * 4), { align: "center" });
    });
    
   // ============================================
// 6. NUMERACIÓN DE PÁGINAS
// ============================================

const totalPagesExp = "{total_pages_count_string}";
const pageCount = doc.internal.getNumberOfPages();
const pageHeight = doc.internal.pageSize.getHeight();

for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);

  // Línea separadora elegante
  doc.setDrawColor(220);
  doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

  // Número de página
  doc.setFontSize(8);
  doc.setTextColor(120);

  doc.text(
    `Página ${i} de ${totalPagesExp}`,
    pageWidth - 27,
    pageHeight - 6,
  );
}

if (typeof doc.putTotalPages === "function") {
  doc.putTotalPages(totalPagesExp);
}




    // ============================================
    // 6. GUARDAR PDF
    // ============================================
    const nombreArchivo = `libro_ingresos_${perfil.nif}_${year}_${trimestre}.pdf`;
    doc.save(nombreArchivo);
    
    console.log(`Libro oficial exportado: ${nombreArchivo}`);
    
  } catch (error) {
    console.error("Error generando libro oficial:", error);
    alert("Error al generar el libro oficial: " + error.message);
  }
}

/* =========================
   CARGAR LISTA DE FACTURAS
========================= */
async function cargarFacturas(session, facturasList, yearSelect, trimestreSelect) {
  const year = Number(yearSelect.value);
  const trimestre = trimestreSelect.value;

  console.log("Cargando facturas para:", year, trimestre);

  const trimestreMap = {
    T1: ["01-01", "03-31"],
    T2: ["04-01", "06-30"],
    T3: ["07-01", "09-30"],
    T4: ["10-01", "12-31"],
  };

  const [inicio, fin] = trimestreMap[trimestre];
const fechaInicio = `${year}-${inicio}`;
const fechaFin = `${year}-${fin}`;
  const desde = (paginaActual - 1) * FACTURAS_POR_PAGINA;
const hasta = desde + FACTURAS_POR_PAGINA - 1;

const { data: facturas, error, count } = await supabase
  .from("facturas")
  .select("*", { count: "exact" })
  .eq("user_id", session.user.id)
  .gte("fecha", fechaInicio)
  .lte("fecha", fechaFin)
  .order("fecha", { ascending: false })
  .range(desde, hasta);


  if (error) {
    console.error("Error cargando facturas:", error);
    return;
  }

  facturasActuales = facturas || [];

  facturasList.innerHTML = "";
  const totalPaginas = Math.ceil((count || 0) / FACTURAS_POR_PAGINA);
  const trimestreCerrado = await trimestreEstaCerrado(
    session.user.id,
    year,
    trimestre
  );

  console.log("Trimestre cerrado:", trimestreCerrado, "para", year, trimestre);
  console.log("Facturas encontradas:", facturas?.length);

  if (!facturas || facturas.length === 0) {
    facturasList.innerHTML = "<li>No hay facturas para este trimestre</li>";
    return;
  }

  facturas.forEach((f) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    li.style.padding = "12px 0";
    li.style.borderBottom = "1px solid #e5e7eb";

    li.innerHTML = `
      <span>
        ${f.fecha} · ${f.concepto} · ${f.base.toFixed(2)} € + IVA ${f.iva}% 
        ${
          f.estado === "emitida"
            ? `· 🧾 <strong>${f.numero_factura}</strong>`
            : "· 📝 <em>Borrador</em>"
        }
      </span>
      <span style="display:flex;gap:8px;">
        ${
          trimestreCerrado
            ? "🔒 <em>Trimestre cerrado</em>"
            : f.estado !== "emitida"
            ? `
                <button onclick="window.emitirFacturaUI('${f.id}')" style="background:#2563eb;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">📤 Emitir</button>
                <button onclick="window.editarFactura('${f.id}')" style="background:#fbbf24;color:black;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">✏️</button>
                <button onclick="window.borrarFactura('${f.id}')" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">🗑️</button>
              `
            : ""
        }
      </span>
    `;

    facturasList.appendChild(li);
  });
  // =====================
// CONTROLES PAGINACIÓN
// =====================

if (totalPaginas > 1) {
  const paginacionDiv = document.createElement("div");
  paginacionDiv.style.marginTop = "15px";
  paginacionDiv.style.display = "flex";
  paginacionDiv.style.justifyContent = "center";
  paginacionDiv.style.alignItems = "center";
  paginacionDiv.style.gap = "12px";

  paginacionDiv.innerHTML = `
    <button ${paginaActual === 1 ? "disabled" : ""} id="prevPageBtn">
      ⬅ Anterior
    </button>

    <span style="font-weight:600;">
      Página ${paginaActual} de ${totalPaginas}
    </span>

    <button ${paginaActual === totalPaginas ? "disabled" : ""} id="nextPageBtn">
      Siguiente ➡
    </button>
  `;

  facturasList.appendChild(paginacionDiv);

  document.getElementById("prevPageBtn")?.addEventListener("click", async () => {
    if (paginaActual > 1) {
      paginaActual--;
      await window.handlePeriodoChange();
    }
  });

  document.getElementById("nextPageBtn")?.addEventListener("click", async () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      await window.handlePeriodoChange();
    }
  });
}
}

/* =========================
   FUNCIONES GLOBALES PARA LOS BOTONES
========================= */
window.emitirFacturaUI = async (facturaId) => {
  try {
    const session = await getSession();
    if (!session) {
      alert("Sesión no válida");
      return;
    }

    console.log("Emitiendo factura ID:", facturaId);

    // Primero verificar que la factura existe y es borrador
    const { data: factura, error: errorVerificacion } = await supabase
      .from("facturas")
      .select("*")
      .eq("id", facturaId)
      .eq("user_id", session.user.id)
      .single();

    if (errorVerificacion || !factura) {
      alert("No se pudo encontrar la factura");
      return;
    }

    if (factura.estado !== "borrador") {
      alert("Esta factura ya ha sido emitida");
      return;
    }

    // Verificar si el trimestre está cerrado
    const fecha = new Date(factura.fecha);
    const year = fecha.getFullYear();
    const trimestre = "T" + (Math.floor(fecha.getMonth() / 3) + 1);

    const cerrado = await trimestreEstaCerrado(
      session.user.id,
      year,
      trimestre
    );

    if (cerrado) {
      alert(`❌ No puedes emitir facturas del trimestre ${trimestre} ${year} (está cerrado)`);
      return;
    }

    const numero = await emitirFactura(facturaId, session.user.id);
    
    // FORZAR ACTUALIZACIÓN COMPLETA
    if (window.handlePeriodoChange) {
      console.log("Actualizando después de emitir factura...");
      await window.handlePeriodoChange();
    }

    alert(`Factura emitida correctamente: ${numero}`);
  } catch (err) {
    console.error("Error al emitir factura:", err);
    alert("Error al emitir la factura: " + (err.message || "Error desconocido"));
  }
};

window.editarFactura = async (id) => {
  const session = await getSession();
  if (!session) return;

  const { data: factura } = await supabase
    .from("facturas")
    .select("*")
    .eq("id", id)
    .single();

  if (!factura) return;

  const fecha = new Date(factura.fecha);
  const year = fecha.getFullYear();
  const trimestre = "T" + (Math.floor(fecha.getMonth() / 3) + 1);

  const cerrado = await trimestreEstaCerrado(
    session.user.id,
    year,
    trimestre
  );

  if (cerrado) {
    alert("❌ No puedes editar facturas de un trimestre cerrado");
    return;
  }

  const concepto = prompt("Concepto:", factura.concepto);
  if (concepto === null) return;

  const base = prompt("Base imponible (€):", factura.base);
  if (base === null) return;

  if (!concepto || !base) return;

  await supabase
    .from("facturas")
    .update({
      concepto,
      base: Number(base),
    })
    .eq("id", id);

  alert("✅ Factura actualizada correctamente");
  
  // FORZAR ACTUALIZACIÓN COMPLETA
  if (window.handlePeriodoChange) {
    console.log("Actualizando después de editar factura...");
    await window.handlePeriodoChange();
  }
};

window.borrarFactura = async (id) => {
  const session = await getSession();
  if (!session) {
    alert("Sesión no válida");
    return;
  }

  const { data: factura, error } = await supabase
    .from("facturas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !factura) {
    alert("No se pudo encontrar la factura");
    return;
  }

  const fecha = new Date(factura.fecha);
  const year = fecha.getFullYear();
  const trimestre = "T" + (Math.floor(fecha.getMonth() / 3) + 1);

  const cerrado = await trimestreEstaCerrado(
    session.user.id,
    year,
    trimestre
  );

  if (cerrado) {
    alert("❌ No puedes borrar facturas de un trimestre cerrado");
    return;
  }

  if (!confirm("¿Borrar factura definitivamente?")) return;

  await supabase
    .from("facturas")
    .delete()
    .eq("id", id);

  alert("✅ Factura borrada correctamente");

  // FORZAR ACTUALIZACIÓN COMPLETA
  if (window.handlePeriodoChange) {
    console.log("Actualizando después de borrar factura...");
    await window.handlePeriodoChange();
  }
};

/* =========================
   FUNCIÓN ÚNICA PARA REFRESCAR TODO
========================= */
async function refrescarPeriodoActual(
  session,
  yearSelect,
  trimestreSelect,
  facturasList,
  ivaRepercutidoEl, ivaSoportadoEl, ivaResultadoEl, ivaEstadoEl,
  irpfIngresosEl, irpfGastosEl, irpfResultadoEl,
  ivaAnualEl, irpfAnualEl, resultadoAnualEl,
  libroIngresosBody, libroGastosBody,
  ivaHistoricoBody, irpfHistoricoBody
) {
  const year = Number(yearSelect.value);
  const trimestre = trimestreSelect.value;

  console.log("=== REFRESCANDO PERIODO ===", year, trimestre);

  // EJECUTAR TODAS LAS CARGAS EN PARALELO
  await Promise.all([
    cargarIVA(session, year, trimestre, ivaRepercutidoEl, ivaSoportadoEl, ivaResultadoEl, ivaEstadoEl),
    cargarIRPF(session, year, trimestre, irpfIngresosEl, irpfGastosEl, irpfResultadoEl),
    cargarResumenAnual(session, year, ivaAnualEl, irpfAnualEl, resultadoAnualEl),
    cargarFacturas(session, facturasList, yearSelect, trimestreSelect),
    // AHORA CON FILTROS POR AÑO/TRIMESTRE:
    cargarIvaHistorico(session, ivaHistoricoBody, year), // Solo año seleccionado
    cargarIrpfHistorico(session, irpfHistoricoBody, year) // Solo año seleccionado
  ]);

  console.log("=== PERIODO REFRESCADO ===");
}

/* =========================
   MANEJADOR DE EVENTO PARA CERRAR TRIMESTRE
========================= */
async function manejarCierreTrimestre(session, yearSelect, trimestreSelect) {
  const cerrarTrimestreBtn = document.getElementById("cerrarTrimestreBtn");
  if (!cerrarTrimestreBtn) return;

  const year = Number(yearSelect.value);
  const trimestre = trimestreSelect.value;

  const cerrado = await trimestreEstaCerrado(
    session.user.id,
    year,
    trimestre
  );

  if (cerrado) {
    cerrarTrimestreBtn.textContent = "✅ Trimestre cerrado";
    cerrarTrimestreBtn.disabled = true;
    cerrarTrimestreBtn.style.opacity = "0.6";
    cerrarTrimestreBtn.style.cursor = "not-allowed";
    return;
  }

  cerrarTrimestreBtn.textContent = "🔒 Cerrar trimestre";
  cerrarTrimestreBtn.disabled = false;
  cerrarTrimestreBtn.style.opacity = "1";
  cerrarTrimestreBtn.style.cursor = "pointer";

  // Remover cualquier evento previo para evitar duplicados
  const newBtn = cerrarTrimestreBtn.cloneNode(true);
  cerrarTrimestreBtn.parentNode.replaceChild(newBtn, cerrarTrimestreBtn);
  
  newBtn.addEventListener("click", async function cerrarTrimestreHandler() {
    console.log("CLICK cerrar trimestre");
    const confirmar = confirm(
      `⚠️ Vas a cerrar el ${trimestre} de ${year}.\n\n` +
      `No podrás emitir, editar ni borrar facturas de este trimestre.\n\n` +
      `¿Confirmas el cierre?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("cierres_trimestrales")
      .insert({
        user_id: session.user.id,
        year,
        trimestre,
      });

    if (error) {
      if (error.code === "23505") {
        alert("Este trimestre ya está cerrado.");
      } else {
        console.error(error);
        alert("Error al cerrar el trimestre");
      }
      return;
    }

    alert(`✅ ${trimestre} ${year} cerrado correctamente`);

    if (window.handlePeriodoChange) {
      console.log("Actualizando después de cerrar trimestre...");
      await window.handlePeriodoChange();
    }
  });
}

/* =========================
   MANEJADOR DE EVENTO PARA AÑADIR FACTURA (CON FECHA)
========================= */
function manejarAgregarFactura(session, yearSelect, trimestreSelect) {
  const addFacturaBtn = document.getElementById("addFacturaBtn");
  const conceptoInput = document.getElementById("concepto");
  const baseInput = document.getElementById("base");
  const fechaInput = document.getElementById("fechaFactura");
  const ivaSelect = document.getElementById("iva");
  const tipoSelect = document.getElementById("tipo");

  if (!addFacturaBtn) return;

  // Establecer fecha por defecto (hoy)
  if (fechaInput) {
    const hoy = new Date();
    fechaInput.value = hoy.toISOString().slice(0, 10);
  }

  // Remover cualquier evento previo
  const newBtn = addFacturaBtn.cloneNode(true);
  addFacturaBtn.parentNode.replaceChild(newBtn, addFacturaBtn);

  newBtn.addEventListener("click", async () => {
    console.log("CLICK Guardar factura");
    
    const concepto = conceptoInput.value.trim();
    const base = Number(baseInput.value);
    const fecha = fechaInput ? fechaInput.value : new Date().toISOString().slice(0, 10);
    const iva = Number(ivaSelect.value);
    const tipo = tipoSelect.value;

    if (!concepto || !base || base <= 0) {
      alert("Rellena concepto y base (valor positivo)");
      return;
    }

    if (!fecha) {
      alert("Selecciona una fecha para la factura");
      return;
    }

    // Obtener año y trimestre de la fecha seleccionada
    const fechaObj = new Date(fecha);
    const añoFactura = fechaObj.getFullYear();
    const mesFactura = fechaObj.getMonth();
    const trimestreFactura = "T" + (Math.floor(mesFactura / 3) + 1);

    console.log("Fecha de la factura:", {
      fecha: fecha,
      año: añoFactura,
      mes: mesFactura,
      trimestre: trimestreFactura
    });

    // Verificar si el trimestre de la factura está cerrado
    const cerrado = await trimestreEstaCerrado(
      session.user.id,
      añoFactura,
      trimestreFactura
    );

    if (cerrado) {
      alert(`❌ No puedes añadir facturas al trimestre ${trimestreFactura} de ${añoFactura} (está cerrado)`);
      return;
    }

    console.log("Insertando factura con fecha:", fecha);

    const tipoCliente = document.getElementById("tipoCliente")?.value || null;
const clienteNombre = document.getElementById("clienteNombre")?.value.trim() || null;
const clienteNif = document.getElementById("clienteNif")?.value.trim() || null;

// Validación empresa
if (tipoCliente === "empresa" && !clienteNif) {
  alert("El NIF es obligatorio si el cliente es empresa/autónomo");
  return;
}

console.log("Guardando factura con:", {
  tipoCliente,
  clienteNombre,
  clienteNif
});

// Insertar la factura
const { error } = await supabase.from("facturas").insert({
  user_id: session.user.id,
  concepto,
  base,
  iva,
  tipo,
  fecha,
  estado: "borrador",
  tipo_cliente: tipoCliente,
  cliente_nombre: clienteNombre,
  cliente_nif: clienteNif
});

    if (error) {
      console.error("Error Supabase:", error);
      alert(error.message);
      return;
    }

    // Limpiar formulario
    conceptoInput.value = "";
    baseInput.value = "";
    if (fechaInput) {
      const hoy = new Date();
      fechaInput.value = hoy.toISOString().slice(0, 10);
    }

    // FORZAR ACTUALIZACIÓN COMPLETA
    if (window.handlePeriodoChange) {
      console.log("Actualizando después de guardar factura...");
      await window.handlePeriodoChange();
    }
  });
}

/* =========================
   INICIALIZACIÓN DE LA APLICACIÓN
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM cargado - Iniciando aplicación OFICIAL");
  
  /* =========================
     ELEMENTOS UI
  ========================= */
  const loginBtn = document.getElementById("loginBtn");
  const ctaBtn = document.getElementById("ctaBtn");
  const landing = document.getElementById("landing");
  const dashboard = document.getElementById("dashboard");
  const userEmail = document.getElementById("userEmail");
  const perfilFiscalBtn = document.getElementById("perfilFiscalBtn"); // NUEVO

  const yearSelect = document.getElementById("yearSelect");
  const trimestreSelect = document.getElementById("trimestreSelect");

  // IVA
  const ivaRepercutidoEl = document.getElementById("ivaRepercutido");
  const ivaSoportadoEl = document.getElementById("ivaSoportado");
  const ivaResultadoEl = document.getElementById("ivaResultado");
  const ivaEstadoEl = document.getElementById("ivaEstado");

  // IRPF
  const irpfIngresosEl = document.getElementById("irpfIngresos");
  const irpfGastosEl = document.getElementById("irpfGastos");
  const irpfResultadoEl = document.getElementById("irpfResultado");

  // Resumen anual
  const ivaAnualEl = document.getElementById("ivaAnual");
  const irpfAnualEl = document.getElementById("irpfAnual");
  const resultadoAnualEl = document.getElementById("resultadoAnual");

  // Formulario factura
  const conceptoInput = document.getElementById("concepto");
  const baseInput = document.getElementById("base");
  const fechaInput = document.getElementById("fechaFactura");
  const ivaSelect = document.getElementById("iva");
  const tipoSelect = document.getElementById("tipo");

  // Listados
  const facturasList = document.getElementById("facturasList");
  const exportPdfBtn = document.getElementById("exportPdfBtn");

  // Históricos
  const ivaHistoricoBody = document.querySelector("#ivaHistorico tbody");
  const irpfHistoricoBody = document.querySelector("#irpfHistorico tbody");

  // Libros
  const libroIngresosBody = document.querySelector("#libroIngresos tbody");
  const exportLibroIngresosBtn = document.getElementById("exportLibroIngresosBtn");

  const libroGastosBody = document.querySelector("#libroGastos tbody");
  const exportLibroGastosBtn = document.getElementById("exportLibroGastosBtn");

  console.log("Elementos cargados:", {
    loginBtn: !!loginBtn,
    perfilFiscalBtn: !!perfilFiscalBtn,
    addFacturaBtn: !!document.getElementById("addFacturaBtn"),
    cerrarTrimestreBtn: !!document.getElementById("cerrarTrimestreBtn"),
    fechaInput: !!fechaInput,
    ivaRepercutidoEl: !!ivaRepercutidoEl,
    irpfIngresosEl: !!irpfIngresosEl
  });

  /* =========================
     SESIÓN
  ========================= */
  const session = await getSession();

  if (!session) {
    loginBtn.textContent = "Continuar con Google";
    loginBtn.onclick = login;
    if (ctaBtn) ctaBtn.onclick = login;
    console.log("No hay sesión - Mostrando landing");
    return;
  }

  userEmail.textContent = session.user.email;
  loginBtn.textContent = "Logout";
  loginBtn.onclick = logout;

  landing.classList.add("hidden");
  dashboard.classList.remove("hidden");
  console.log("Sesión activa - Mostrando dashboard");

  // Configurar botón de perfil fiscal
  if (perfilFiscalBtn) {
    perfilFiscalBtn.addEventListener('click', async () => {
      const { data: perfil } = await supabase
        .from('perfil_fiscal')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      mostrarModalPerfilFiscal(perfil);
    });
  }

  /* =========================
     PERIODO ACTUAL
  ========================= */
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentTrimestre = "T" + (Math.floor(now.getMonth() / 3) + 1);

  // Llenar años
  yearSelect.innerHTML = "";
  for (let y = currentYear; y >= currentYear - 3; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  yearSelect.value = currentYear;
  trimestreSelect.value = currentTrimestre;

  // ✅ FUNCIÓN UNIFICADA PARA CAMBIOS DE PERIODO (ORQUESTADOR ÚNICO)
  window.handlePeriodoChange = async () => {

    console.log("handlePeriodoChange ejecutado");
    
    await refrescarPeriodoActual(
      session,
      yearSelect,
      trimestreSelect,
      facturasList,
      ivaRepercutidoEl, ivaSoportadoEl, ivaResultadoEl, ivaEstadoEl,
      irpfIngresosEl, irpfGastosEl, irpfResultadoEl,
      ivaAnualEl, irpfAnualEl, resultadoAnualEl,
      libroIngresosBody, libroGastosBody,
      ivaHistoricoBody, irpfHistoricoBody
    );

    // ✅ ACTUALIZAR BOTÓN CERRAR TRIMESTRE
    await manejarCierreTrimestre(session, yearSelect, trimestreSelect);
    
    // ✅ CONFIGURAR MANEJADOR DE AÑADIR FACTURA (con los selects correctos)
    manejarAgregarFactura(session, yearSelect, trimestreSelect);
    
    console.log("handlePeriodoChange completado");
  };

  yearSelect.addEventListener("change", async () => {
  paginaActual = 1;
  await handlePeriodoChange();
});

trimestreSelect.addEventListener("change", async () => {
  paginaActual = 1;
  await handlePeriodoChange();
});


  // 🔁 CARGA INICIAL USANDO EL MISMO FLUJO
  console.log("Realizando carga inicial...");
  await handlePeriodoChange();
  console.log("Carga inicial completada");

  /* =========================
   EXPORTAR MIS FACTURAS A PDF (VERSIÓN MANUAL - FUNCIONA)
========================= */
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", async () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Error: jsPDF no está cargado");
      return;
    }

    const year = Number(yearSelect.value);
const trimestre = trimestreSelect.value;

const trimestreMap = {
  T1: ["01-01", "03-31"],
  T2: ["04-01", "06-30"],
  T3: ["07-01", "09-30"],
  T4: ["10-01", "12-31"],
};

const [inicio, fin] = trimestreMap[trimestre];
const fechaInicio = `${year}-${inicio}`;
const fechaFin = `${year}-${fin}`;

const { data: facturasParaPDF } = await supabase
  .from("facturas")
  .select("*")
  .eq("user_id", session.user.id)
  .gte("fecha", fechaInicio)
  .lte("fecha", fechaFin)
  .order("fecha", { ascending: true });

    if (!facturasParaPDF || facturasParaPDF.length === 0) {
      alert("No hay facturas para exportar");
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const totalPagesExp = "{total_pages_count_string}";
      
      // Configuración básica
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const tableWidth = pageWidth - (margin * 2);
      
      let y = 20;

      // Título simple
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE FACTURAS - TuGestor", pageWidth / 2, y, { align: "center" });
      
      y += 10;
      
      // Fecha
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const fechaActual = new Date().toLocaleDateString('es-ES');
      doc.text(`Generado: ${fechaActual}`, pageWidth / 2, y, { align: "center" });
      
      y += 15;

      // Resumen simple
      let totalEmitidas = 0;
      let totalRecibidas = 0;
      let baseEmitida = 0;
      let baseRecibida = 0;
      
      facturasParaPDF.forEach(f => {
        if (f.tipo === "emitida") {
          totalEmitidas++;
          baseEmitida += f.base;
        } else {
          totalRecibidas++;
          baseRecibida += f.base;
        }
      });

      // Tabla de resumen simple
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Facturas emitidas: ${totalEmitidas}`, margin, y);
      doc.text(`Base emitida: ${baseEmitida.toFixed(2)} €`, margin + 80, y);
      y += 7;
      doc.text(`Facturas recibidas: ${totalRecibidas}`, margin, y);
      doc.text(`Base recibida: ${baseRecibida.toFixed(2)} €`, margin + 80, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text(`Total facturas: ${totalEmitidas + totalRecibidas}`, margin, y);
      doc.text(`Base total: ${(baseEmitida + baseRecibida).toFixed(2)} €`, margin + 80, y);
      
      y += 15;

      // Tabla detallada simple - ENCABEZADO
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE FACTURAS", margin, y);
      y += 10;

      // Encabezado de tabla con color
      doc.setFillColor(41, 99, 235); // Azul TuGestor
      doc.rect(margin, y, tableWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      
      // Columnas
      let xPos = margin;
      const columnWidths = [25, 60, 25, 25, 20, 25];
      const headers = ["Fecha", "Concepto", "Tipo", "Base", "IVA", "Total"];
      
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, y + 7);
        xPos += columnWidths[index];
      });
      
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Datos de la tabla
      let rowIndex = 0;
      facturasParaPDF.forEach(f => {
        const total = f.base + (f.base * f.iva) / 100;
        
        // Color de fondo alternado
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 247, 251);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, y, tableWidth, 8, 'F');
        
        // Contenido de la fila
        xPos = margin;
        
        // Fecha
        doc.text(f.fecha, xPos + 2, y + 6);
        xPos += columnWidths[0];
        
        // Concepto (truncado si es muy largo)
        const concepto = f.concepto.length > 30 ? f.concepto.substring(0, 27) + "..." : f.concepto;
        doc.text(concepto, xPos + 2, y + 6);
        xPos += columnWidths[1];
        
        // Tipo
        const tipo = f.tipo === "emitida" ? "Emitida" : "Recibida";
        doc.text(tipo, xPos + 2, y + 6);
        xPos += columnWidths[2];
        
        // Base
        doc.text(`${f.base.toFixed(2)} €`, xPos + 2, y + 6);
        xPos += columnWidths[3];
        
        // IVA
        doc.text(`${f.iva}%`, xPos + 2, y + 6);
        xPos += columnWidths[4];
        
        // Total
        doc.text(`${total.toFixed(2)} €`, xPos + 2, y + 6);
        
        y += 8;
        rowIndex++;
        
        // Si llega al final de la página, crear nueva
        if (y > 270) {
          doc.addPage();
          y = 20;
          
          // Redibujar encabezado
          doc.setFillColor(41, 99, 235);
          doc.rect(margin, y, tableWidth, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          
          xPos = margin;
          headers.forEach((header, index) => {
            doc.text(header, xPos + 2, y + 7);
            xPos += columnWidths[index];
          });
          
          y += 10;
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        }
      });
      
      y += 10;

      // Totales finales
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTALES FINALES:", margin, y);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`• Facturas emitidas: ${totalEmitidas} (${baseEmitida.toFixed(2)} €)`, margin, y + 8);
      doc.text(`• Facturas recibidas: ${totalRecibidas} (${baseRecibida.toFixed(2)} €)`, margin, y + 16);
      doc.setFont("helvetica", "bold");
      doc.text(`• Total general: ${totalEmitidas + totalRecibidas} facturas (${(baseEmitida + baseRecibida).toFixed(2)} €)`, margin, y + 24);

      // Pie de página
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("TuGestor - Sistema de gestión fiscal", pageWidth / 2, 285, { align: "center" });

      // Guardar PDF
      doc.save("facturas_tugestor.pdf");
      
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Revisa la consola para más detalles.");
    }
  });
}

/* =========================
   EXPORTAR LIBRO DE INGRESOS A PDF (OFICIAL - PARA HACIENDA)
========================= */
if (exportLibroIngresosBtn) {
  exportLibroIngresosBtn.addEventListener("click", async () => {
    console.log("Exportando libro oficial de ingresos");
    
    // 1. Verificar perfil fiscal
    const perfilCheck = await verificarPerfilFiscal(session);
    if (!perfilCheck.completo) {
      const completar = confirm(`${perfilCheck.mensaje}\n\n¿Quieres completarlo ahora?`);
      if (completar) {
        mostrarModalPerfilFiscal(perfilCheck.perfil, async () => {
          // Intentar exportar de nuevo después de guardar
          await exportarLibroIngresosOficial(session, yearSelect.value, trimestreSelect.value);
        });
      }
      return;
    }

    // 2. Exportar libro oficial
    await exportarLibroIngresosOficial(session, yearSelect.value, trimestreSelect.value);
  });
}

/* =========================
   EXPORTAR LIBRO DE GASTOS A PDF (VERSIÓN MANUAL - FUNCIONA)
========================= */
if (exportLibroGastosBtn) {
  exportLibroGastosBtn.addEventListener("click", async () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Error: jsPDF no está cargado");
      return;
    }

    const year = Number(yearSelect.value);
    const trimestre = trimestreSelect.value;

    const trimestreMap = {
      T1: ["01-01", "03-31"],
      T2: ["04-01", "06-30"],
      T3: ["07-01", "09-30"],
      T4: ["10-01", "12-31"],
    };

    const [inicio, fin] = trimestreMap[trimestre];
    const fechaInicio = `${year}-${inicio}`;
    const fechaFin = `${year}-${fin}`;

    const { data: gastos } = await supabase
      .from("facturas")
      .select("*")
      .eq("tipo", "recibida")
      .eq("user_id", session.user.id)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: true });

    if (!gastos || gastos.length === 0) {
      alert(`No hay gastos en ${trimestre} de ${year} para exportar`);
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const tableWidth = pageWidth - (margin * 2);
      
      let y = 20;

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LIBRO DE GASTOS", pageWidth / 2, y, { align: "center" });
      
      y += 8;
      
      // Periodo
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const periodoText = `Trimestre: ${trimestre} - Año: ${year}`;
      doc.text(periodoText, pageWidth / 2, y, { align: "center" });
      
      y += 8;
      
      // Fecha
      doc.setFontSize(10);
      const fechaActual = new Date().toLocaleDateString('es-ES');
      doc.text(`Generado: ${fechaActual}`, pageWidth / 2, y, { align: "center" });
      
      y += 15;

      // Resumen
      let totalBase = 0;
      let totalIVA = 0;
      let totalGastosSum = 0;
      
      gastos.forEach(f => {
        totalBase += f.base;
        const ivaMonto = (f.base * f.iva) / 100;
        totalIVA += ivaMonto;
        totalGastosSum += f.base + ivaMonto;
      });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DEL PERIODO", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Número de facturas: ${gastos.length}`, margin, y);
      y += 7;
      doc.text(`Base imponible total: ${totalBase.toFixed(2)} €`, margin, y);
      y += 7;
      doc.text(`IVA soportado total: ${totalIVA.toFixed(2)} €`, margin, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28); // Rojo
      doc.text(`TOTAL GASTOS: ${totalGastosSum.toFixed(2)} €`, margin, y);
      doc.setTextColor(0, 0, 0);
      
      y += 15;

      // Tabla detallada - ENCABEZADO
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE FACTURAS RECIBIDAS", margin, y);
      y += 10;

      // Encabezado de tabla
      doc.setFillColor(185, 28, 28);
      doc.rect(margin, y, tableWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      
      let xPos = margin;
      const columnWidths = [25, 30, 60, 25, 20, 25];
      const headers = ["Fecha", "Nº Factura", "Proveedor/Concepto", "Base", "IVA", "Total"];
      
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, y + 7);
        xPos += columnWidths[index];
      });
      
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Datos de la tabla
      let rowIndex = 0;
      gastos.forEach((f, index) => {
        const total = f.base + (f.base * f.iva) / 100;
        
        // Color de fondo alternado
        if (rowIndex % 2 === 0) {
          doc.setFillColor(254, 242, 242);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, y, tableWidth, 8, 'F');
        
        // Contenido de la fila
        xPos = margin;
        
        // Fecha
        doc.text(f.fecha, xPos + 2, y + 6);
        xPos += columnWidths[0];
        
        // Número de factura
        const numero = f.numero_factura || `Sin número ${index + 1}`;
        doc.text(numero, xPos + 2, y + 6);
        xPos += columnWidths[1];
        
        // Concepto
        const concepto = f.concepto.length > 30 ? f.concepto.substring(0, 27) + "..." : f.concepto;
        doc.text(concepto, xPos + 2, y + 6);
        xPos += columnWidths[2];
        
        // Base
        doc.text(`${f.base.toFixed(2)} €`, xPos + 2, y + 6);
        xPos += columnWidths[3];
        
        // IVA
        doc.text(`${f.iva}%`, xPos + 2, y + 6);
        xPos += columnWidths[4];
        
        // Total
        doc.text(`${total.toFixed(2)} €`, xPos + 2, y + 6);
        
        y += 8;
        rowIndex++;
        
        // Nueva página si es necesario
        if (y > 270) {
          doc.addPage();
          y = 20;
          
          // Redibujar encabezado
          doc.setFillColor(185, 28, 28);
          doc.rect(margin, y, tableWidth, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          
          xPos = margin;
          headers.forEach((header, idx) => {
            doc.text(header, xPos + 2, y + 7);
            xPos += columnWidths[idx];
          });
          
          y += 10;
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        }
      });
      
      y += 10;

      // Información fiscal
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN FISCAL:", margin, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`• IVA deducible (Modelo 303): ${totalIVA.toFixed(2)} €`, margin, y + 8);
      doc.text(`• IRPF a pagar (Modelo 130): ${(totalBase * 0.20).toFixed(2)} €`, margin, y + 16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61); // Verde
      doc.text(`• Beneficio fiscal total: ${(totalIVA + (totalBase * 0.20)).toFixed(2)} €`, margin, y + 24);
      doc.setTextColor(0, 0, 0);

      // Pie de página
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Documento válido para deducciones fiscales - TuGestor", pageWidth / 2, 285, { align: "center" });

      doc.save(`gastos_${year}_${trimestre}.pdf`);
      
    } catch (error) {
      console.error("Error generando PDF de gastos:", error);
      alert("Error al generar el PDF de gastos: " + error.message);
    }
  }); // Cierra el event listener
}});