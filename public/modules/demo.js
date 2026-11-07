// A4 loader smoke demo. Later vertical-slice modules can subscribe to the same API.
export function init(nova) {
  console.info('[NOVA module] demo ready');
  if (typeof nova?.toast === 'function') nova.toast('MODULE SYSTEM READY', 1600, '#00ffcc');
  return { ready: true };
}
