"""Servidor estático dos testes: `python serve.py <porta> <pasta>`.

Faz o mesmo que `python -m http.server`, mas com fila de conexões grande. O sistema
carrega vários arquivos por página (CSS + um JS por seção) e os testes abrem várias
páginas ao mesmo tempo; com a fila padrão (5) o servidor recusava conexões e a página
ficava sem scripts. Em produção (Vercel, HTTP/2) isso não existe."""
import functools
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Server(ThreadingHTTPServer):
    request_queue_size = 512
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


class Server4(ThreadingHTTPServer):
    request_queue_size = 512


if __name__ == '__main__':
    port = int(sys.argv[1])
    handler = functools.partial(SimpleHTTPRequestHandler, directory=sys.argv[2])
    try:
        httpd = Server(('::', port), handler)
    except OSError:  # sem IPv6
        httpd = Server4(('0.0.0.0', port), handler)
    httpd.serve_forever()
