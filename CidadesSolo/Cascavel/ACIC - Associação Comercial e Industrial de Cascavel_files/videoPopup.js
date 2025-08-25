// document.addEventListener('DOMContentLoaded', function() {
//     // instanciate new modal
//     let modal = new tingle.modal({
//         footer: false,
//         stickyFooter: false,
//         closeMethods: ["button", "escape"],
//         closeLabel: "Fechar",
//         cssClass: ["modal-home-info"]
//     });
    
//     const content_video = `
//         <iframe width="850" height="478" src="https://www.youtube.com/embed/NXTvWBwtFMQ?si=B3V1kk2-5bc-DkdZ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
//     `;

//     modal.setContent(content_video);

//     setTimeout(() => {
//         // open modal
//         modal.open();
//     }, 2000);

// }, false);

window.openModalVideoSpc = () => {

    openInNewTab('https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action');
    
    // let modal = new tingle.modal({
    //     footer: false,
    //     stickyFooter: false,
    //     closeMethods: ["button", "escape"],
    //     closeLabel: "Fechar",
    //     cssClass: ["modal-home-info"]
    // });
    
    // const content_video = `
    //     <iframe width="850" height="478" src="https://www.youtube.com/embed/NXTvWBwtFMQ?si=B3V1kk2-5bc-DkdZ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    // `;

    // modal.setContent(content_video);
    // modal.open();

    // setTimeout(() => {
    //     openInNewTab('https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action');
    // }, 2000);

    
    
};

function openInNewTab(url) {
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (newTab) {
        // If a new tab was successfully created, you can blur the current window
        // to ensure the focus remains on the current tab.
        newTab.blur();
        window.focus();
    }
}