package client;
import java.awt.*;

public class WallCrawlerSprite extends Sprite
{
    static final int WC_WIDTH = 30;
    static final int WC_HEIGHT = 60;
    int m_direction;
    int[][] m_directionData;
    static final int[][] g_drawPoints;
    RotationalPolygon m_rPoly;
    static final int[][] g_c_directions;
    static final int[][] g_cc_directions;
    
    void handleCrash() {
        ++this.m_direction;
        this.m_direction %= 4;
        if (this.m_direction % 2 == 0) {
            super.shapeRect.resize(30, 60);
        }
        else {
            super.shapeRect.resize(60, 30);
        }
        this.m_rPoly.setAngle(this.m_directionData[this.m_direction][2] * 0.017453292519943295);
        this.move(-super.vectorx, -super.vectory);
        super.vectorx = this.m_directionData[this.m_direction][0];
        super.vectory = this.m_directionData[this.m_direction][1];
    }
    
    public WallCrawlerSprite(final int n, final int n2, final boolean b) {
        super(n, n2);
        this.m_rPoly = new RotationalPolygon(WallCrawlerSprite.g_drawPoints);
        this.init("wc", n, n2, false);
        super.spriteType = 1;
        super.shapeRect = new Rectangle(n - 15, n2 - 30, 30, 60);
        this.setHealth(150, 20);
        this.m_directionData = (b ? WallCrawlerSprite.g_c_directions : WallCrawlerSprite.g_cc_directions);
        super.vectorx = this.m_directionData[this.m_direction][0];
        super.vectory = this.m_directionData[this.m_direction][1];
        this.m_rPoly.setAngle(this.m_directionData[this.m_direction][2] * 0.017453292519943295);
        super.m_powerupType = 15;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(Sprite.g_colors[super.m_slot][super.spriteCycle % 20]);
        graphics.translate(super.intx, super.inty);
        WHUtil.drawPoly(graphics, this.m_rPoly.poly);
        graphics.translate(-1, -1);
        graphics.setColor(Sprite.g_colors[super.m_slot][0]);
        WHUtil.drawPoly(graphics, this.m_rPoly.poly);
        graphics.translate(1 - super.intx, 1 - super.inty);
        final Rectangle shapeRect = this.getShapeRect();
        if (super.m_bSentByPlayer) {
            Sprite.drawFlag(graphics, super.m_color, shapeRect.x + shapeRect.width + 5, shapeRect.y + shapeRect.height + 5);
        }
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(30, 30);
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_drawPoints = new int[][] { { -10, -16 }, { 0, -22 }, { 0, -30 }, { 12, -25 }, { 15, -20 }, { 8, -20 }, { 8, 20 }, { 15, 20 }, { 12, 25 }, { 0, 30 }, { 0, 22 }, { -10, 16 } };
        g_c_directions = new int[][] { { 4, 0, 90 }, { 0, 4, 180 }, { -4, 0, 270 }, { 0, -4, 0 } };
        g_cc_directions = new int[][] { { -4, 0, 90 }, { 0, 4, 0 }, { 4, 0, 270 }, { 0, -4, 180 } };
    }
    
    public void behave() {
        if (super.hasCollided) {
            super.shouldRemoveSelf = true;
        }
        this.move(super.vectorx, super.vectory);
        ++super.spriteCycle;
        if (super.m_bInDrawingRect && super.spriteCycle % 35 == 0) {
            final BulletSprite bulletSprite = new BulletSprite(super.intx, super.inty, 3, 10, super.m_color, 1);
            bulletSprite.setSentByEnemy(super.m_slot, 15);
            final Point calcLead = this.calcLead();
            bulletSprite.setVelocity(6.0 * WHUtil.scaleVector(calcLead.x, calcLead.y), 6.0 * WHUtil.scaleVector(calcLead.y, calcLead.x));
            bulletSprite.addSelf();
        }
    }
}
