
/* ------------------------------------------------------------------------- boot */
wirePop();
wireHeader();
wirePreview();
render();
window.__pft = { get state() { return S; }, get result() { return R; }, goto: goto, setMode: setMode, openLearn: openLearn, bank: bankLoad, signature: signature, load: loadState };
})();
