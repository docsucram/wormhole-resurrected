package client;
import java.awt.*;

public class ParticleSprite extends Sprite
{
    final int GSTATES = 12;
    final int MAX_CYCLE = 40;
    final int PARTICLES = 20;
    int m_particles;
    int m_maxVelocity;
    short[] m_x;
    short[] m_y;
    short[] m_state;
    short[] m_dx;
    short[] m_dy;
    
    ParticleSprite(final int n, final int n2) {
        super(n, n2);
        this.init("particles", n, n2, true);
        super.spriteType = 0;
        super.shapeRect = new Rectangle(n - 70, n2 - 70, 140, 140);
    }
    
    public void drawSelf(final Graphics graphics) {
        for (int i = 0; i < this.m_particles; ++i) {
            graphics.setColor(Color.white);
            graphics.fillRect(this.m_x[i], this.m_y[i], 12 - this.m_state[i], 12 - this.m_state[i]);
        }
    }
    
    void particleInit(final int particles, final int maxVelocity) {
        this.m_x = new short[particles];
        this.m_y = new short[particles];
        this.m_particles = particles;
        this.m_maxVelocity = maxVelocity;
        this.m_state = new short[particles];
        this.m_dx = new short[particles];
        this.m_dy = new short[particles];
        for (int i = 0; i < this.m_particles; ++i) {
            this.m_x[i] = (short)super.intx;
            this.m_y[i] = (short)super.inty;
            this.m_dx[i] = (short)WHUtil.randInt(maxVelocity);
            this.m_dy[i] = (short)WHUtil.randInt(maxVelocity);
            this.m_state[i] = 0;
        }
    }
    
    public void behave() {
        if (super.spriteCycle++ > 12) {
            super.shouldRemoveSelf = true;
            return;
        }
        for (int i = 0; i < this.m_particles; ++i) {
            final short[] state = this.m_state;
            final int n = i;
            ++state[n];
            final short[] x = this.m_x;
            final int n2 = i;
            x[n2] += this.m_dx[i];
            final short[] y = this.m_y;
            final int n3 = i;
            y[n3] += this.m_dy[i];
        }
    }
}
