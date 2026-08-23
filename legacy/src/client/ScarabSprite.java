package client;
import java.awt.*;

public class ScarabSprite extends Sprite
{
    PowerupSprite m_trackingSprite;
    PowerupSprite m_storedSprite;
    static final int[][] g_points;
    static final int[][][] g_drawPoints;
    RotationalPolygon m_rPoly;
    RotationalPolygon[] m_rDrawPoly;
    PortalSprite m_portalSprite;
    boolean m_bGotPowerup;
    
    public Rectangle getShapeRect() {
        final Rectangle bounds = super.m_poly.getBounds();
        bounds.move(super.intx - bounds.width / 2, super.inty - bounds.height / 2);
        return bounds;
    }
    
    public ScarabSprite(final int n, final int n2, final PortalSprite portalSprite) {
        super(n, n2);
        this.m_rPoly = new RotationalPolygon(ScarabSprite.g_points);
        this.init("scb", n, n2, true);
        this.m_portalSprite = portalSprite;
        super.shapeType = 1;
        super.dRotate = 20.0;
        super.m_thrust = 0.3;
        super.maxThrust = 5.0;
        super.spriteType = 1;
        this.setHealth(20, 5);
        this.m_rDrawPoly = new RotationalPolygon[ScarabSprite.g_drawPoints.length];
        for (int i = 0; i < ScarabSprite.g_drawPoints.length; ++i) {
            this.m_rDrawPoly[i] = new RotationalPolygon(ScarabSprite.g_drawPoints[i]);
        }
        if (portalSprite != null) {
            this.m_trackingSprite = this.findClosestPowerup();
        }
        super.m_powerupType = 13;
    }
    
    public void drawSelf(final Graphics graphics) {
        if (this.m_bGotPowerup) {
            this.m_storedSprite.drawSelf(graphics);
        }
        graphics.translate(super.intx, super.inty);
        graphics.setColor(super.m_color);
        for (int i = 0; i < ScarabSprite.g_drawPoints.length; ++i) {
            final Polygon poly = this.m_rDrawPoly[i].poly;
            graphics.drawPolygon(poly.xpoints, poly.ypoints, poly.npoints);
        }
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            if (this.m_bGotPowerup) {
                this.m_storedSprite.spriteCycle = 0;
                this.m_storedSprite.indestructible = true;
                this.m_storedSprite.shouldRemoveSelf = false;
                this.m_storedSprite.addSelf();
            }
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_points = new int[][] { { 35, 18 }, { -26, 18 }, { -26, -18 }, { 35, -18 } };
        g_drawPoints = new int[][][] { { { 20, -3 }, { 29, -12 }, { 35, -11 }, { 40, -10 }, { 48, -5 }, { 40, -12 }, { 35, -17 }, { 29, -17 }, { 15, -5 }, { 15, 5 }, { 29, 17 }, { 35, 17 }, { 40, 10 }, { 48, 5 }, { 40, 12 }, { 35, 11 }, { 29, 12 }, { 20, 3 } }, { { 20, -4 }, { 17, -11 }, { 13, -15 }, { 15, -30 }, { 13, -15 }, { 10, -16 }, { 0, -18 }, { 2, -28 }, { 0, -18 }, { -20, -13 }, { -25, -10 }, { -23, -15 }, { -25, -10 }, { -27, 0 }, { -25, 10 }, { -23, 15 }, { -25, 10 }, { -20, 13 }, { 0, 18 }, { 2, 28 }, { 0, 18 }, { 10, 16 }, { 13, 15 }, { 15, 30 }, { 13, 15 }, { 17, 11 }, { 20, 4 } } };
    }
    
    private PowerupSprite findClosestPowerup() {
        double n = 5000.0;
        PowerupSprite powerupSprite = null;
        for (int i = 0; i < Sprite.model.badGuys.maxElement; ++i) {
            final Sprite sprite = Sprite.model.badGuys.sprites[i];
            if (sprite != null && sprite instanceof PowerupSprite) {
                final PowerupSprite powerupSprite2 = (PowerupSprite)sprite;
                if (powerupSprite2.powerupType > 6) {
                    final double distance = WHUtil.distanceFrom(this, powerupSprite2);
                    if (distance < n) {
                        powerupSprite = powerupSprite2;
                        n = distance;
                    }
                }
            }
        }
        return powerupSprite;
    }
    
    void setDegreeAngle(final double degreeAngle) {
        super.setDegreeAngle(degreeAngle);
        this.m_rPoly.setAngle(super.radAngle);
        this.m_rPoly.recalcPolygon();
        for (int i = 0; i < ScarabSprite.g_drawPoints.length; ++i) {
            this.m_rDrawPoly[i].setAngle(super.radAngle);
            this.m_rDrawPoly[i].recalcPolygon();
        }
        super.m_poly = this.m_rPoly.poly;
    }
    
    public void behave() {
        super.behave();
        if (this.m_bGotPowerup) {
            this.m_storedSprite.setLocation(super.x, super.y);
            if (this.m_portalSprite.shouldRemoveSelf) {
                this.killSelf(10, 5);
                return;
            }
            this.realTrack(this.m_portalSprite.intx, this.m_portalSprite.inty, false);
            if (WHUtil.distanceFrom(this.m_portalSprite, this) < 40.0) {
                Sprite.model.addIncomingPowerup(this.m_portalSprite, (byte)this.m_storedSprite.powerupType, super.m_slot, (byte)0);
                this.killSelf(5, 5);
            }
        }
        else {
            if (this.m_trackingSprite == null || this.m_trackingSprite.shouldRemoveSelf) {
                this.reverseTrack();
                this.m_trackingSprite = this.findClosestPowerup();
                return;
            }
            final int n = (int)WHUtil.distanceFrom(this, this.m_trackingSprite);
            if (super.spriteCycle % 50 == 99 && n > 150) {
                this.m_trackingSprite = this.findClosestPowerup();
            }
            if (n > 20) {
                this.realTrack(this.m_trackingSprite.intx + (int)(this.m_trackingSprite.vectorx * 10.0), this.m_trackingSprite.inty + (int)(this.m_trackingSprite.vectory * 10.0), false);
                return;
            }
            this.m_bGotPowerup = true;
            (this.m_storedSprite = this.m_trackingSprite).setLocation(super.x, super.y);
            this.m_storedSprite.shouldRemoveSelf = true;
        }
    }
}
