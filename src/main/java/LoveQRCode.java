import java.nio.file.Path;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

public class LoveQRCode {
    public static void main(String[] args) throws Exception {
        String text = "I Love You";
        int width = 300;
        int height = 300;

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);

        Path path = Path.of("i_love_you_qr.png");
        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", path);

        System.out.println("QR code saved at: " + path.toAbsolutePath());
    }
}
