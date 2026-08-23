package client;
import java.io.*;

public class PacketStreamWriter
{
    private byte[] m_byteBuffer;
    public DataOutputStream m_oStream;
    private ByteArrayOutputStream m_bOStream;
    private DataOutputStream m_dOutputStream;
    int m_lastSize;
    
    public void reset() {
        this.m_bOStream.reset();
        this.m_lastSize = this.m_oStream.size();
    }

    
    public void sendPacket() throws IOException {
        final int n = this.m_oStream.size() - this.m_lastSize;
        this.m_dOutputStream.writeShort(n);
        this.m_byteBuffer = this.m_bOStream.toByteArray();
        this.m_dOutputStream.write(this.m_byteBuffer, 0, n);
        this.m_dOutputStream.flush();
        this.m_lastSize = this.m_oStream.size();
        this.m_bOStream.reset();
    }
    
    public PacketStreamWriter(final OutputStream outputStream) {
        this.m_bOStream = new ByteArrayOutputStream();
        this.m_oStream = new DataOutputStream(this.m_bOStream);
        this.m_dOutputStream = new DataOutputStream(outputStream);
    }
    
    public DataOutputStream getStream() {
        return this.m_oStream;
    }
}
