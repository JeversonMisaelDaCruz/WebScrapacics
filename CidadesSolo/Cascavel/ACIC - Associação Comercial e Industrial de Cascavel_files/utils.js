//variaveis globais
let sys_config = {};

document.addEventListener("DOMContentLoaded", function() {
    //seta as variaveis de configuração
    sys_config.debug = document.getElementById('config_debug').value;
    sys_config.url_base = document.getElementById('config_url_base').value;
    sys_config.url_base_adm = document.getElementById('config_url_base_adm').value;
    sys_config.url_public = document.getElementById('config_url_public').value;
    sys_config.app_token = document.getElementById('config_app_token').value;
    sys_config.recaptcha_key = document.getElementById('config_recaptcha_key').value;
});

//função que ajuda na requisição ajax
function sendAjax(dataRequest, callSuccess) {
    let request = $.ajax({
        'url': sys_config.url_base + '/api/' + dataRequest.url,
        headers: { 'token': sys_config.app_token },
        type: dataRequest.type,
        data: dataRequest.data
    });

    request.done(function(response) {
        if(sys_config.debug)
            console.log(response);

        callSuccess(response);
    });

    //callback de erro
    request.fail(function(jqXHR, textStatus) {
        if(sys_config.debug) {
            console.log("Request failed: " + textStatus);
            console.log(jqXHR);
        }
    });
}

function sendAjaxWithLink($link, dataRequest, callSuccess) {
    let request = $.ajax({
        'url': $link,
        headers: { 'token': sys_config.app_token },
        type: dataRequest.type,
        data: dataRequest.data
    });

    request.done(function(response) {
        if(sys_config.debug)
            console.log(response);

        callSuccess(response);
    });

    //callback de erro
    request.fail(function(jqXHR, textStatus) {
        if(sys_config.debug) {
            console.log("Request failed: " + textStatus);
            console.log(jqXHR);
        }
    });
}

function retornaDataBR(data) {
    dataSplit = data.split('-');
    let newData = dataSplit[2] + '/' + dataSplit[1] + '/' + dataSplit[0];
    return newData;
}

function formatReal(valor)
{
    if(!isNaN(valor))
        valor = parseFloat(valor);
    return valor.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'})
}

function mascaraCnpj(valor) {
    return valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g,"\$1.\$2.\$3\/\$4\-\$5");
}

//valida tamanho do valor
function validSizeInput(valor, tamanhoMin, tamanhoMax) {
    if(valor.length >= tamanhoMin) {
        if(tamanhoMax) {
            if(valor.length < tamanhoMax) {
                return true;
            }
            else return false;
        }
        else return true;
    }
    else return false;
}

//verifica se checkbox está marcado
function verifyCheckbox(id) {
    var check = document.getElementById(id); 

    if (check.checked == true){ 
        return true;

    }  else {
       return false;
    }
}

//converte objeto Javascript para URlEnconded
function JSON_to_URLEncoded(element,key,list){
    var list = list || [];
    if(typeof(element)=='object'){
      for (var idx in element)
        JSON_to_URLEncoded(element[idx],key?key+'['+idx+']':idx,list);
    } else {
      list.push(key+'='+encodeURIComponent(element));
    }
    return list.join('&');
}

//inicia o datatable em PT
function setDatatable(id) {
    $('#' + id).DataTable({
        "order": [[ 0, "desc" ]],
        "lengthMenu": [20],
        "language": {
            "lengthMenu": "Mostrar _MENU_ registros por página",
            "zeroRecords": "Nada encontrado!",
            "info": "Mostrando página _PAGE_ de _PAGES_",
            "infoEmpty": "Nenhum resultado disponível",
            "infoFiltered": "(Filtrado de um total de _MAX_ total resultados)",
            'search': 'Pesquisar',
        }
    });
}

  function destroyDatatable(id) {
    $('#' + id).DataTable().clear();
    $('#' + id).DataTable().destroy();
}

function getIdUrl() {
    let url = window.location.href;
    let id = url.split('/');
    return id[id.length - 1];
}

function getUrlAnt() {
    let url = window.location.href;
    let id = url.split('/');
    return id[id.length - 2];
}

//ordena array de forma randômica
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }


function removeUrlParam(param) {
    let url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.pushState('object or string', 'Title', url);
}