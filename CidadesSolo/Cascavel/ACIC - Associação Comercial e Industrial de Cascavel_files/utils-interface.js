 //usado para o SweeAlert
 const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000
});

//------------------------ Manipula componente de alertas
// {'success', 'error', 'info', 'warning', 'question'} type 
function showAlert(title, type = '') {
    
    let tipo;

    switch (type) {
        case 'success':
            tipo = 'success';
            break;
        case 'error':
            tipo = 'error';
            break;
        case 'info':
            tipo = 'info';
            break;
        case 'warning':
            tipo = 'warning';
            break;
    
        default:
            tipo = 'question';
            break;
    }

    Toast.fire({
        type: tipo,
        title: title
    });
}

function showToast(title, type) {
    
    toastr.options = {
        "closeButton": true,
        "progressBar": true
    };

    switch (type) {
        case 'success':
            toastr.success(title);
            break;
        case 'info':
            toastr.info(title);
            break;
        case 'error':
            toastr.error(title);
            break;
        case 'warning':
            toastr.warning(title);
            break;
        default:
            break;
    }
    
}

function showToastHtml(title, html, type = '', delay = 3000) {
    switch (type) {
        case '':
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay
            });
            break;
        case 'success':
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay,
                class: 'bg-success'
            });       
            break;
        case 'error':
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay,
                class: 'bg-danger'
            });       
            break;
        case 'warning':
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay,
                class: 'bg-warning'
            });       
            break;
        case 'info':
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay,
                class: 'bg-info'
            });       
            break;
    
        default:
            $(document).Toasts('create', {
                title: title,
                body: html,
                autohide: true,
                delay: delay
            });
            break;
    }
}

function setAlert(id_container, type, body, title = 'Alerta!') {
    let icon = '';
    switch (type) {
        case 'danger':
            icon = '<i class="fas fa-ban"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info"></i>';
            break;
        case 'success':
            icon = '<i class="fas fa-check"></i>';
            break;
        default:
            icon = '<i class="fas fa-info"></i>';
            break;
    }
    
    let alerta = '' +
    '<div class="alert alert-'+ type +' alert-dismissible">' +
        '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>' +
        '<h5>'+ icon +'&nbsp;&nbsp;'+ title +'</h5>' +
        body +
    '</div>';

    document.getElementById(id_container).innerHTML = alerta;
}

//---------------- Colocar loader no botão
function setButtonLoader(idButton) {
    let btn = document.getElementById(idButton);
    btn.setAttribute('disabled','');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="sr-only">Loading...</span>';
}

function removeButtonLoader(idButton, value) {
    let btn = document.getElementById(idButton);
    btn.removeAttribute('disabled');
    btn.innerHTML = value;
}


//------------------------- Loader
function getLoaderCenter() {
    return '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
}

//---------------------- Manipula bordas de erro e sucesso nos inputs
function setErrorInput(idInput, withLabel = true) {
    let inp = document.getElementById(idInput);
    
    //remove possível borda de sucesso
    inp.classList.remove('border-success');
    //adiciona borda de erro
    inp.classList.add('border-danger');

    if(withLabel) {
        let lab = document.querySelector('[for="'+ idInput +'"]');
        //remove possível cor de sucesso
        lab.classList.remove('text-success');
        //adiciona cor de erro
        lab.classList.add('text-danger');
    }
}

function setSuccessInput(idInput, withLabel = true) {
    let inp = document.getElementById(idInput);
    
    //remove possível borda de erro
    inp.classList.remove('border-danger');
    //adiciona borda de sucesso
    inp.classList.add('border-success');

    if(withLabel) {
        let lab = document.querySelector('[for="'+ idInput +'"]');
        //remove possível cor de erro
        lab.classList.remove('text-danger');
        //adiciona cor de sucesso
        lab.classList.add('text-success');
    }
}

function clearInput(idInput, withLabel = true) {
    let inp = document.getElementById(idInput);
    
    //remove possível borda de erro
    inp.classList.remove('border-danger');
    //adiciona borda de sucesso
    inp.classList.remove('border-success');

    if(withLabel) {
        let lab = document.querySelector('[for="'+ idInput +'"]');
        //remove possível cor de erro
        lab.classList.remove('text-danger');
        //adiciona cor de sucesso
        lab.classList.remove('text-success');
    }
}

//-------------------- modal dinamico

function removeModal() {
    document.getElementById('modalContent').innerHTML = ''
    document.getElementById('modal-title').innerHTML = '';

    $('#modal').modal('hide');
}

function showModal(conteudo, titulo = '', tamanho = '') {
    document.getElementById('modalContent').innerHTML = conteudo;
    document.getElementById('modal-title').innerHTML = titulo;
    if(tamanho != '')
        document.getElementById('modal-dialog').classList.add(tamanho);

    $('#modal').modal('show');
}