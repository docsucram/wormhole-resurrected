package client;
import java.awt.*;

public class HeatSeekerMissile extends Sprite
{
    static final short[][] g_points;
    static Polygon[] g_polys;
    private Sprite m_trackingSprite;
    private int m_delayTime;
    private int m_trackingX;
    private int m_trackingY;
    private static final int MAX_JOINTS = 20;
    private int[][] m_lastJointPt;
    private int m_index;
    
    public void setGood(final int trackingX, final int trackingY, final int delayTime) {
        super.spriteType = 2;
        this.m_trackingSprite = null;
        this.m_trackingX = trackingX;
        this.m_trackingY = trackingY;
        super.m_bIsHeatSeeker = true;
        super.dRotate = 20.0;
        super.m_thrust = 8.0;
        super.maxThrust = 8.0;
        this.setHealth(1, 50);
        this.m_lastJointPt = new int[20][2];
        super.m_bIsBullet = true;
        this.m_delayTime = delayTime;
        int n = 0;
        do {
            this.m_lastJointPt[n][0] = super.intx;
            this.m_lastJointPt[n][1] = super.inty;
        } while (++n < 20);
    }
    
    void handleCrash() {
        super.handleCrash();
        this.killSelf(10, 15);
    }
    
    public HeatSeekerMissile(final int n, final int n2) {
        super(n, n2);
        this.init("hs", n, n2, false);
        super.dRotate = 16.0;
        super.m_thrust = 0.1;
        super.maxThrust = 7.0;
        this.setHealth(1, 10);
        super.shapeRect = new Rectangle(super.intx, super.inty, 10, 10);
        super.spriteType = 1;
        this.rotate(0.0);
        super.m_powerupType = 6;
        this.m_trackingSprite = Sprite.model.m_player;
    }
    
    public void rotate(final double n) {
        super.rotate(n);
        super.m_poly = HeatSeekerMissile.g_polys[(int)(super.angle / 15.0 + 4.0) % 16];
    }
    
    public void drawSelf(final Graphics graphics) {
        if (super.spriteType == 2) {
            graphics.setColor(Sprite.model.m_color);
            int intx = super.intx;
            int inty = super.inty;
            int n = 1;
            do {
                final int n2 = (this.m_index - n + 20) % 20;
                graphics.drawLine(this.m_lastJointPt[n2][0], this.m_lastJointPt[n2][1], intx, inty);
                intx = this.m_lastJointPt[n2][0];
                inty = this.m_lastJointPt[n2][1];
            } while (++n < 20);
            graphics.translate(this.m_trackingX, this.m_trackingY);
            graphics.drawLine(0, -10, 0, 10);
            graphics.drawLine(-10, 0, 10, 0);
            graphics.translate(-this.m_trackingX, -this.m_trackingY);
            return;
        }
        graphics.translate(super.intx, super.inty);
        graphics.setColor(Sprite.g_colors[super.m_slot][0]);
        WHUtil.drawPoly(graphics, super.m_poly);
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        this.killSelf(3, 15);
    }
    
    static {
        g_points = new short[][] { { 0, -8 }, { -3, -3 }, { 5, 0 }, { 0, 5 } };
    }
    
    boolean inViewingRect(final Rectangle rectangle) {
        if (super.spriteType != 2) {
            return super.inViewingRect(rectangle);
        }
        if (!rectangle.contains(super.intx, super.inty)) {
            final int[] array = this.m_lastJointPt[(this.m_index + 1 + 20) % 20];
            return rectangle.contains(array[0], array[1]);
        }
        return true;
    }
    
    public static void initClass() {
        HeatSeekerMissile.g_polys = new Polygon[16];
        final RotationalPolygon constructPolygon = RotationalPolygon.constructPolygon(HeatSeekerMissile.g_points, true);
        constructPolygon.rotate(0.0);
        int n = 0;
        do {
            HeatSeekerMissile.g_polys[n] = constructPolygon.cloneMyPolygon();
            constructPolygon.rotate(15.0);
        } while (++n < 16);
    }
    
    public void behave() {
        super.behave();
        if (super.spriteType == 2) {
            if (this.m_delayTime-- <= 0) {
                this.m_delayTime = 5;
                final double n = 0.0;
                super.vectorx = n;
                super.vectory = n;
                this.realTrack(this.m_trackingX, this.m_trackingY, false);
            }
            this.m_lastJointPt[this.m_index][0] = super.intx;
            this.m_lastJointPt[this.m_index++][1] = super.inty;
            this.m_index %= 20;
            return;
        }
        this.realTrack(this.m_trackingSprite.intx, this.m_trackingSprite.inty, false);
    }
}
