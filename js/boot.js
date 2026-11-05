const status = document.getElementById('load-status');

try {
  await import('./main.js');
} catch (error) {
  console.error('Earth could not start:', error);
  status.textContent = '地球加载失败，请刷新页面；若仍无法显示，请检查浏览器是否已开启硬件加速。';
  status.setAttribute('role', 'alert');
}
