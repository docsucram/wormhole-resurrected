package client;
import java.awt.*;

public class MineLayerSprite extends Sprite
{
    static final int[][] g_directions;
    int m_directionalCycles;
    static final double MAX_VEL = 5.0;
    
    public MineLayerSprite(final int n, final int n2) {
        super(n, n2);
        this.init("ml", n, n2, true);
        super.spriteType = 1;
        super.m_poly = WHUtil.symPolygon(8, 35, 0);
        super.shapeType = 1;
        this.setHealth(50, 10);
        super.m_powerupType = 11;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(super.m_color);
        WHUtil.drawCenteredCircle(graphics, super.intx, super.inty, 30);
        graphics.setColor(Sprite.g_colors[super.m_slot][super.spriteCycle % 20]);
        WHUtil.fillCenteredCircle(graphics, super.intx, super.inty, 20);
        graphics.drawLine(super.intx - 30, super.inty, super.intx + 30, super.inty);
        graphics.drawLine(super.intx, super.inty - 30, super.intx, super.inty + 30);
        graphics.setPaintMode();
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(10, 20);
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_directions = new int[][] { { 1, 0 }, { -1, 0 }, { 0, -1 }, { 0, 1 } };
    }
    
    public void behave() {
        super.behave();
        super.m_poly = WHUtil.symPolygon(8, 35, 0);
        if (super.spriteCycle > this.m_directionalCycles) {
            super.spriteCycle = 0;
            this.m_directionalCycles = WHUtil.randABSInt() % 150 + 100;
            final int n = WHUtil.randABSInt() % 4;
            super.vectorx = 5.0 * MineLayerSprite.g_directions[n][0];
            super.vectory = 5.0 * MineLayerSprite.g_directions[n][1];
            return;
        }
        if (super.spriteCycle % 50 == 0) {
            final MineSprite mineSprite = new MineSprite(super.intx, super.inty);
            mineSprite.setPlayer(super.m_slot, super.m_color);
            mineSprite.spriteCycle = 20;
            mineSprite.addSelf();
        }
    }
    
    public Rectangle getShapeRect() {
        final Rectangle bounds = super.m_poly.getBounds();
        bounds.move(super.intx - bounds.width / 2, super.inty - bounds.height / 2);
        return bounds;
    }
}
