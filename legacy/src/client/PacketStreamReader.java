package client;
import java.io.*;

public class PacketStreamReader
{
    private byte[] m_byteBuffer;
    DataInputStream m_iStream;
    
    public DataInput getDataInput() {
        return this.m_iStream;
    }
    
    public PacketStreamReader(final InputStream inputStream) {
        this.m_iStream = new DataInputStream(inputStream);
    }
    
    public byte[] getBuffer() {
        return this.m_byteBuffer;
    }
    
    public short readPacket(final byte[] array) throws IOException {
        final short short1 = this.m_iStream.readShort();
        array[0] = (byte)(short1 >> 8);
        array[1] = (byte)(short1 & 0xFF);
        if (short1 < 0 || short1 > array.length) {
            throw new IOException("Illegal numBytes read: " + short1);
        }
        this.m_iStream.readFully(array, 2, short1);
        return short1;
    }
    
    public short readPacket() throws IOException {
        if (this.m_byteBuffer == null) {
            this.m_byteBuffer = new byte[4096];
        }
        return this.readPacket(this.m_byteBuffer);
    }
    
    public DataInputStream getStream() {
        return this.m_iStream;
    }
}
