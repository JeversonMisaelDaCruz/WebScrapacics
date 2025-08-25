function openFacaparte() {
    location.href = sys_config.url_base + '/seja_associado';
}

function openFacaparteModal() {
    $('#fc_telefone').mask('(00) 0000-00000');
    $('#fc_cnpj').mask('00.000.000/0000-00');

    $('#modal-faca-parte').modal('show');
}

function saveFacaparte () {
    if(!validateCaptchaFacaparte()) {
        showToast('Campo de verificação inválido!', 'error');
        return false;
    }
    else
        setButtonLoader('btnFacaParteSave');
}

function validateCaptchaFacaparte() {
    // Validação do reCAPTCHA Google v2
    const recaptchaResponse = grecaptcha.getResponse();
    
    if (recaptchaResponse.length === 0) {
        // O usuário não completou o captcha
        return false;
    } else {
        // O captcha foi preenchido corretamente
        return true;
    }
}