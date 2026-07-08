import java.io.IOException;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.Optional;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class LoveQRCode {
    public static void main(String[] args) throws Exception {
        Path projectRoot = Path.of("").toAbsolutePath().normalize();
        Path htmlPath = projectRoot.resolve("photo.html");
        Path imagePath = projectRoot.resolve("dengue.jpeg");
        if (!Files.exists(imagePath)) {
            imagePath = projectRoot.resolve("src").resolve("dengue.jpeg");
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> redirectToPhoto(exchange));
        server.createContext("/photo.html", new FileHandler(htmlPath, "text/html; charset=utf-8"));
        server.createContext("/dengue.jpeg", new FileHandler(imagePath, "image/jpeg"));
        server.createContext("/src/dengue.jpeg", new FileHandler(imagePath, "image/jpeg"));
        server.setExecutor(null);
        server.start();

        int port = server.getAddress().getPort();
        String hostAddress = findLocalIp().orElse("127.0.0.1");
        String localUrl = "http://" + hostAddress + ":" + port + "/photo.html";

        System.out.println("Local Server running at: " + localUrl);
        System.out.print("Enter your Vercel deployed URL (leave empty and press Enter to use local URL instead): ");
        
        java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
        String inputLine = reader.readLine();
        String pageUrl;
        if (inputLine == null || inputLine.trim().isEmpty()) {
            pageUrl = localUrl;
        } else {
            pageUrl = inputLine.trim();
        }

        int width = 300;
        int height = 300;

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(pageUrl, BarcodeFormat.QR_CODE, width, height);

        Path qrPath = Path.of("photo_qr.png");
        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", qrPath);

        System.out.println("\n------------------------------------------------");
        System.out.println("QR code successfully generated for: " + pageUrl);
        System.out.println("QR code saved at: " + qrPath.toAbsolutePath());
        System.out.println("------------------------------------------------\n");
        System.out.println("Press Enter in the console to stop the local server.");

        System.in.read();
        server.stop(0);
    }

    private static void redirectToPhoto(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Location", "/photo.html");
        exchange.sendResponseHeaders(302, -1);
        exchange.close();
    }

    private static Optional<String> findLocalIp() throws IOException {
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        while (interfaces.hasMoreElements()) {
            NetworkInterface networkInterface = interfaces.nextElement();
            if (!networkInterface.isUp() || networkInterface.isLoopback() || networkInterface.isVirtual()) {
                continue;
            }
            Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress address = addresses.nextElement();
                if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                    return Optional.of(address.getHostAddress());
                }
            }
        }
        return Optional.empty();
    }

    private static class FileHandler implements HttpHandler {
        private final Path path;
        private final String contentType;

        FileHandler(Path path, String contentType) {
            this.path = path;
            this.contentType = contentType;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!Files.exists(path)) {
                byte[] notFound = "404 Not Found".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(404, notFound.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(notFound);
                }
                return;
            }

            byte[] bytes = Files.readAllBytes(path);
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }
}
