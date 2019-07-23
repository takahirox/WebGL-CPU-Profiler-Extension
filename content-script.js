function injectionScript() {
  HTMLCanvasElement.prototype.originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function(){
    const context = this.originalGetContext.apply(this, arguments);

    if(arguments[0].indexOf('webgl') !== 0) return context;

    const constDictionary = {};

    for(const key in context) {
      if(typeof context[key] !== 'number') continue;
      if(key.match(/^[0-9A-Z_]+$/) === null) continue;

      const value = context[key];
      if(constDictionary[value] === undefined) {
        constDictionary[value] = key;
      } else {
        constDictionary[value] += '|' + key;
      }
    }

    const baseTime = performance.now();

    const history = WebGLCPUProfiler.history;
    const historyMaxNum = WebGLCPUProfiler.historyMaxNum;
    const doFlush = WebGLCPUProfiler.flush;

    const keys = Object.keys(context);

    for(const key in context) {
      if(key.indexOf('_original') === 0) continue;
      if((typeof context[key]) !== 'function') continue;

      const originalKey = '_original' + key;
      context[originalKey] = context[key];
      context[key] = function() {
        if(history.length >= historyMaxNum) {
          return context[originalKey].apply(context, arguments);
        }

        const args = [];
        for(let i = 0; i < arguments.length; i++) {
          const value = arguments[i];

          if(typeof value === 'number'
              || typeof value === 'boolean'
              || typeof value === 'string') {
            args[i] = value;
          } else {
            args[i] = typeof value;
          }

          if(constDictionary[value] !== undefined) {
            args[i] += '(' + constDictionary[value] + ')';
          }
        }

        const param = {
          function: key,
          arguments: args
        };

        if(doFlush) {
          context._originalflush();
        }

        const startTime = performance.now();
        const result = context[originalKey].apply(context, arguments);

        if(doFlush) {
          context._originalflush();
        }

        const endTime = performance.now();

        param.time = startTime - baseTime;
        param.elapsedTime = endTime - startTime;

        history.push(param);

        return result;
      };
    }

    return context;
  };

  console.log(this);
}

const source = '' +
'const WebGLCPUProfiler = {' +
'  history: [],' +
'  historyMaxNum: 0x100000,' +
'  flush: false' +
'};' +
'(' + injectionScript + ')();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
