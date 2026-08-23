package client;
import java.awt.*;

public class ShrapnelSprite extends Sprite
{
    int m_shrapnel;
    double[] m_x;
    double[] m_y;
    double[] m_dx;
    double[] m_dy;
    double[] m_rotation;
    double[] m_angle;
    int[] m_len;
    final int MAX_CYCLE = 200;
    
    public ShrapnelSprite(final int n, final int n2, final int n3, final Color color, final int shrapnel) {
        super(n, n2);
        this.init("shrapnel", n, n2, false);
        this.m_shrapnel = shrapnel;
        super.spriteType = 0;
        super.shapeRect = new Rectangle(0, 0);
        super.m_color = color;
        this.m_x = new double[this.m_shrapnel];
        this.m_y = new double[this.m_shrapnel];
        this.m_dx = new double[this.m_shrapnel];
        this.m_dy = new double[this.m_shrapnel];
        this.m_rotation = new double[this.m_shrapnel];
        this.m_angle = new double[this.m_shrapnel];
        this.m_len = new int[this.m_shrapnel];
        for (int i = 0; i < this.m_shrapnel; ++i) {
            this.m_x[i] = n + WHUtil.randInt(n3);
            this.m_y[i] = n2 + WHUtil.randInt(n3);
            this.m_dx[i] = WHUtil.randInt(3);
            this.m_dy[i] = WHUtil.randInt(3);
            this.m_rotation[i] = WHUtil.randInt(70) / 100.0;
            this.m_angle[i] = WHUtil.randInt(3) / 100.0;
            this.m_len[i] = WHUtil.randABSInt() % 3 + 4;
        }
    }
    
    public ShrapnelSprite(final int n, final int n2, final int n3, final Color color) {
        this(n, n2, n3, color, 10);
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(super.m_color);
        for (int i = 0; i < this.m_shrapnel; ++i) {
            final double n = this.m_len[i] * Math.cos(this.m_angle[i]) / 2.0;
            final double n2 = this.m_len[i] * Math.sin(this.m_angle[i]) / 2.0;
            graphics.drawLine((int)(this.m_x[i] - n), (int)(this.m_y[i] - n2), (int)(this.m_x[i] + n), (int)(this.m_y[i] + n2));
        }
    }
    
    public void behave() {
        super.behave();
        if (super.spriteCycle++ > 200) {
            super.shouldRemoveSelf = true;
            return;
        }
        for (int i = 0; i < this.m_shrapnel; ++i) {
            final double[] angle = this.m_angle;
            final int n = i;
            angle[n] += this.m_rotation[i];
            final double[] x = this.m_x;
            final int n2 = i;
            x[n2] += this.m_dx[i];
            final double[] y = this.m_y;
            final int n3 = i;
            y[n3] += this.m_dy[i];
        }
    }
}
