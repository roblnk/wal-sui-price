self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: `Giá ${data.symbol} cập nhật: ${data.price} USD`,
  };
  event.waitUntil(self.registration.showNotification('gửi thông báo tele', options));
});