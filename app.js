  let mesaActual = null;
  let listaProductosGlobal = []; // NUEVA VARIABLE
  // Este objeto guardará temporalmente los pedidos de cada mesa mientras la app esté abierta
  let cuentasMesas = { '1': [], '2': [], '3': [], '4': [], '5': [] };

  // 1. Cuando la página termine de cargar, le pedimos los productos a Apps Script
  document.addEventListener('DOMContentLoaded', function() {
    google.script.run
      .withSuccessHandler(llenarDesplegable) // Si funciona, ejecuta esta función
      .withFailureHandler(function(error) { alert("Error al cargar productos: " + error); })
      .obtenerProductos();
  });

  // 2. Función que recibe los productos y llena el <select>
  function llenarDesplegable(productos) {
    listaProductosGlobal = productos; // <-- AGREGA ESTA LÍNEA
    const select = document.getElementById('selectProducto');
    select.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    
    productos.forEach(function(producto) {
      const option = document.createElement('option');
      option.value = producto.nombre;
      // Guardamos el precio escondido en la opción para usarlo al sumar la cuenta
      option.setAttribute('data-precio', producto.precio);
      option.textContent = `${producto.nombre} - $${producto.precio}`;
      select.appendChild(option);
    });
  }

  // 3. Funciones del Modal
  function abrirModal(elemento) {
    mesaActual = elemento.getAttribute('data-mesa');
    document.getElementById('tituloModal').textContent = (mesaActual === '5') ? 'Barra' : 'Mesa ' + mesaActual;
    
    actualizarVistaCuenta(); // Mostramos lo que ya haya pedido esta mesa antes
    document.getElementById('modalPedido').style.display = 'flex';
  }

  function cerrarModal() {
    document.getElementById('modalPedido').style.display = 'none';
    document.getElementById('selectProducto').value = '';
    mesaActual = null;
  }

  // 4. Lógica para agregar al carrito
  function agregarProducto() {
    const select = document.getElementById('selectProducto');
    
    const nombreProducto = select.value;
    const cantidad = 1; // <--- Siempre agregamos 1 por defecto al hacer clic
    
    if (nombreProducto === '') {
      alert('Por favor selecciona un producto.');
      return;
    }

    const opcionSeleccionada = select.options[select.selectedIndex];
    const precioUnitario = parseFloat(opcionSeleccionada.getAttribute('data-precio'));

    // Buscamos si el producto ya está en la cuenta de esta mesa
    const indexExistente = cuentasMesas[mesaActual].findIndex(item => item.nombre === nombreProducto);

    if (indexExistente !== -1) {
      // Si ya existe, le sumamos 1 a la cantidad
      cuentasMesas[mesaActual][indexExistente].cantidad += cantidad;
    } else {
      // Si es nuevo, lo agregamos al arreglo con cantidad 1
      cuentasMesas[mesaActual].push({ 
        nombre: nombreProducto, 
        precio: precioUnitario, 
        cantidad: cantidad 
      });
    }
    
    // Actualizamos la vista para que aparezca en la lista con los botones + y -
    actualizarVistaCuenta();
    
    // Limpiamos la selección para el siguiente pedido
    select.value = ''; 
  }

// 5. Función que dibuja la lista con controles de cantidad y subtotal
  function actualizarVistaCuenta() {
    const lista = document.getElementById('listaCuenta');
    const labelTotal = document.getElementById('totalCuenta');
    lista.innerHTML = '';
    
    let totalGlobal = 0;
    const productosDeLaMesa = cuentasMesas[mesaActual];

    if (productosDeLaMesa.length === 0) {
      lista.innerHTML = '<li style="color: #7f8c8d; font-style: italic;">Sin productos aún</li>';
    } else {
      productosDeLaMesa.forEach(function(item, index) {
        const subtotal = item.precio * item.cantidad;
        totalGlobal += subtotal;
        
        const li = document.createElement('li');
        li.className = 'item-cuenta';
        li.style.borderBottom = "1px solid #f0f0f0";
        li.style.padding = "8px 0";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        li.innerHTML = `
          <div style="flex-grow: 1;">
            <strong style="color: #2c3e50;">${item.nombre}</strong><br>
            <span style="color: #7f8c8d; font-size: 0.85rem;">$${item.precio.toFixed(2)} c/u</span>
          </div>
          
          <!-- Controles de Cantidad y Totales -->
          <div style="display: flex; align-items: center; gap: 15px;">
            
            <!-- Botones + y - -->
            <div style="display: flex; align-items: center; background-color: #ecf0f1; border-radius: 20px; padding: 2px 8px;">
              <button onclick="disminuirCantidad(${index})" style="border: none; background: none; color: #e74c3c; font-weight: bold; font-size: 1.2rem; cursor: pointer; padding: 0 5px;">-</button>
              <span style="font-weight: bold; min-width: 20px; text-align: center; font-size: 1rem;">${item.cantidad}</span>
              <button onclick="aumentarCantidad(${index})" style="border: none; background: none; color: #27ae60; font-weight: bold; font-size: 1.2rem; cursor: pointer; padding: 0 5px;">+</button>
            </div>
            
            <strong style="min-width: 65px; text-align: right;">$${subtotal.toFixed(2)}</strong>
            
            <!-- Botón Eliminar (Tachuela roja) -->
            <button onclick="eliminarProducto(${index})" style="background: none; border: none; color: #c0392b; cursor: pointer; font-weight: bold; font-size: 1.2rem; padding: 0;">&times;</button>
          </div>
        `;
        lista.appendChild(li);
      });
    }
    
    labelTotal.textContent = totalGlobal.toFixed(2);
    actualizarEstadoMesas();
  }

  // 6. Lógica para cobrar y limpiar la cuenta
  function pagarCuenta() {
    // Verificamos si hay algo que cobrar
    if (cuentasMesas[mesaActual].length === 0) {
      alert('La cuenta ya está en $0.00, no hay nada que cobrar.');
      return;
    }

    // Pedimos confirmación para evitar clics accidentales
    const confirmar = confirm('¿Confirmas el pago total de esta mesa?');
    
    if (confirmar) {
      // 1. Vaciamos el arreglo de productos de esa mesa
      cuentasMesas[mesaActual] = [];
      
      // 2. Actualizamos la vista para que el modal quede en ceros
      actualizarVistaCuenta();
      
      // 3. Avisamos que se cobró con éxito
      alert('¡Cuenta pagada! La mesa está lista para una nueva orden.');
      
      // 4. Cerramos el modal automáticamente
      cerrarModal();
    }
  }

  // --- LÓGICA PARA NUEVOS PRODUCTOS ---

  function abrirModalProducto() {
    document.getElementById('modalNuevoProducto').style.display = 'flex';
  }

  function cerrarModalProducto() {
    document.getElementById('modalNuevoProducto').style.display = 'none';
    document.getElementById('nuevoNombre').value = '';
    document.getElementById('nuevoCosto').value = '';
  }

  function guardarProducto() {
    const nombre = document.getElementById('nuevoNombre').value;
    const costo = parseFloat(document.getElementById('nuevoCosto').value);

    // Validamos que los campos no estén vacíos
    if (nombre.trim() === '' || isNaN(costo) || costo <= 0) {
      alert('Por favor ingresa un nombre y un costo válido.');
      return;
    }

    // Cambiamos el texto del botón para que el usuario sepa que está cargando
    const btn = event.target;
    btn.textContent = "Guardando...";
    btn.disabled = true;

    // Enviamos los datos a Google Sheets
    google.script.run
      .withSuccessHandler(function(respuesta) {
        alert('¡Producto guardado exitosamente!');
        cerrarModalProducto();
        
        // Restauramos el botón
        btn.textContent = "💾 Guardar en Inventario";
        btn.disabled = false;
        
        // (Opcional) Volvemos a pedir los productos para que el nuevo aparezca en los menús de las mesas
        google.script.run.withSuccessHandler(llenarDesplegable).obtenerProductos();
      })
      .withFailureHandler(function(error) {
        alert('Error al guardar: ' + error);
        btn.textContent = "💾 Guardar en Inventario";
        btn.disabled = false;
      })
      .guardarNuevoProducto(nombre, costo);
  }

  // --- LÓGICA PARA MODIFICAR PRODUCTOS ---

  function abrirModalModificar() {
    document.getElementById('modalModificarProducto').style.display = 'flex';
    
    const select = document.getElementById('selectModificar');
    select.innerHTML = '<option value="">-- Elige un producto --</option>';
    
    // Llenamos el select con los productos que ya tenemos en memoria
    listaProductosGlobal.forEach(function(producto) {
      const option = document.createElement('option');
      option.value = producto.nombre;
      option.setAttribute('data-precio', producto.precio);
      option.textContent = `${producto.nombre} - $${producto.precio}`;
      select.appendChild(option);
    });
    
    // Limpiamos los inputs
    document.getElementById('modificarNombre').value = '';
    document.getElementById('modificarCosto').value = '';
  }

  function cerrarModalModificar() {
    document.getElementById('modalModificarProducto').style.display = 'none';
  }

  // Se activa sola cuando eliges un producto del menú desplegable
  function cargarDatosModificar() {
    const select = document.getElementById('selectModificar');
    const nombre = select.value;
    
    if (nombre === "") {
       document.getElementById('modificarNombre').value = '';
       document.getElementById('modificarCosto').value = '';
       return;
    }
    
    const opcionSeleccionada = select.options[select.selectedIndex];
    const precio = opcionSeleccionada.getAttribute('data-precio');
    
    // Autocompletamos los campos con los datos actuales
    document.getElementById('modificarNombre').value = nombre;
    document.getElementById('modificarCosto').value = precio;
  }

  function guardarModificacion() {
    const select = document.getElementById('selectModificar');
    const nombreOriginal = select.value; // Necesitamos saber cuál era el nombre antes del cambio
    
    if (nombreOriginal === "") {
      alert('Selecciona un producto primero');
      return;
    }
    
    const nuevoNombre = document.getElementById('modificarNombre').value;
    const nuevoCosto = parseFloat(document.getElementById('modificarCosto').value);
    
    if (nuevoNombre.trim() === '' || isNaN(nuevoCosto) || nuevoCosto <= 0) {
      alert('Por favor ingresa datos válidos.');
      return;
    }

    const btn = event.target;
    btn.textContent = "Actualizando...";
    btn.disabled = true;

    // Enviamos el cambio a Google Sheets
    google.script.run
      .withSuccessHandler(function() {
        alert('¡Producto actualizado exitosamente!');
        cerrarModalModificar();
        btn.textContent = "💾 Actualizar Producto";
        btn.disabled = false;
        
        // Volvemos a pedir todos los productos para que la vista se actualice
        google.script.run.withSuccessHandler(llenarDesplegable).obtenerProductos();
      })
      .withFailureHandler(function(error) {
        alert('Error al modificar: ' + error);
        btn.textContent = "💾 Actualizar Producto";
        btn.disabled = false;
      })
      .modificarProductoEnHoja(nombreOriginal, nuevoNombre, nuevoCosto);
  }

    // NUEVA FUNCIÓN: Para borrar una línea si se equivocan
  function eliminarProducto(index) {
    cuentasMesas[mesaActual].splice(index, 1);
    actualizarVistaCuenta();
  }

  // NUEVAS FUNCIONES: Controles rápidos de cantidad
  function aumentarCantidad(index) {
    cuentasMesas[mesaActual][index].cantidad++;
    actualizarVistaCuenta();
  }

  function disminuirCantidad(index) {
    // Si la cantidad es mayor a 1, solo la restamos
    if (cuentasMesas[mesaActual][index].cantidad > 1) {
      cuentasMesas[mesaActual][index].cantidad--;
      actualizarVistaCuenta();
    } else {
      // Si la cantidad es 1 y le dan al "-", interpretamos que quieren borrarlo
      eliminarProducto(index);
    }
  }

  // NUEVA FUNCIÓN: Actualiza el texto y color de las mesas en el menú principal
  function actualizarEstadoMesas() {
    // Recorremos las 5 mesas (1 al 4, y 5 que es la barra)
    for (let i = 1; i <= 5; i++) {
      const numeroMesa = i.toString();
      // Buscamos el texto de "estado" de esta mesa en específico
      const elementoEstado = document.querySelector(`.mesa[data-mesa="${numeroMesa}"] .estado`);
      
      if (elementoEstado) {
        // Si el arreglo de esta mesa tiene al menos 1 producto...
        if (cuentasMesas[numeroMesa] && cuentasMesas[numeroMesa].length > 0) {
          elementoEstado.textContent = 'Ocupada';
          elementoEstado.style.color = '#e74c3c'; // Rojo
        } else {
          // Si está vacío (0 productos)...
          elementoEstado.textContent = 'Libre';
          elementoEstado.style.color = '#2ecc71'; // Verde
        }
      }
    }
  }
