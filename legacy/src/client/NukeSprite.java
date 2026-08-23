package client;
import java.awt.*;

public class NukeSprite extends Sprite
{
    static final int NUKE_SIZE = 40;
    private boolean m_bShotAlready;
    int m_radius;
    static final int D_RADIUS = 30;
    final double MAX_RADIUS = 1000.0;
    int m_countdown;
    double m_dropTime;
    int m_mode;
    static final int COUNTDOWN = 0;
    static final int DETONATE = 1;
    static final int COUNTDOWN_TIME = 9;
    
    public void addSelf() {
        super.addSelf();
        this.m_dropTime = System.currentTimeMillis();
        Sprite.model.m_flashScreenColor = Sprite.g_colors[super.m_slot][0];
    }
    
    public boolean isCollision(final Sprite sprite) {
        final double distance = WHUtil.distanceFrom(this, sprite);
        return distance <= this.m_radius && distance > this.m_radius - 50;
    }
    
    public NukeSprite(final int n, final int n2, final byte slot) {
        super(n, n2);
        this.m_radius = 10;
        this.m_mode = 0;
        this.init("nuke", n, n2, true);
        super.shapeRect = new Rectangle(n - 20, n2 - 20, 40, 40);
        super.spriteType = 1;
        super.m_slot = slot;
        super.m_color = Sprite.g_colors[super.m_slot][0];
        super.indestructible = false;
        this.setHealth(100, 0);
        super.m_powerupType = 14;
    }
    
    public void drawSelf(final Graphics graphics) {
        if (this.m_mode == 0) {
            int n = 0;
            do {
                final int n2 = super.spriteCycle + n * 120;
                graphics.setColor(super.m_color);
                WHUtil.fillCenteredArc(graphics, super.intx, super.inty, 40, n2, 60);
                graphics.setColor(Color.black);
                WHUtil.fillCenteredArc(graphics, super.intx, super.inty, 20, n2, 60);
            } while (++n < 3);
            graphics.setColor(super.m_color);
            WHUtil.fillCenteredCircle(graphics, super.intx, super.inty, 15);
            graphics.setColor(Color.black);
            graphics.setFont(WormholeModel.fontLarge);
            if (this.m_countdown >= 0) {
                graphics.drawString("" + this.m_countdown, super.intx - 6, super.inty + 6);
            }
        }
        else {
            int n3 = 0;
            do {
                graphics.setColor(Sprite.g_colors[super.m_slot][n3]);
                if (this.m_radius - n3 * 5 > 0) {
                    WHUtil.drawCenteredCircle(graphics, super.intx, super.inty, this.m_radius - n3 * 5);
                }
            } while (++n3 < 10);
        }
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (collided == Sprite.model.m_player) {
            Sprite.model.m_flashScreenColor = Sprite.g_colors[super.m_slot][0];
            super.shouldRemoveSelf = false;
            this.m_mode = 1;
            final double angle = WHUtil.findAngle(collided.x, collided.y, super.x, super.y);
            collided.vectorx += 2.0 * Math.cos(angle * 0.017453292519943295);
            collided.vectory += 2.0 * Math.sin(angle * 0.017453292519943295);
            return;
        }
        if (!super.shouldRemoveSelf) {
            this.m_bShotAlready = true;
            super.vectorx += collided.vectorx / 4.0;
            super.vectory += collided.vectory / 4.0;
            return;
        }
        this.killSelf();
    }
    
    public void behave() {
        super.behave();
        if (this.m_mode == 0) {
            this.m_countdown = (int)(8.0 - (System.currentTimeMillis() - this.m_dropTime) / 1000.0);
            super.shapeRect.reshape(super.intx - 60, super.inty - 60, 120, 120);
            if (this.m_countdown <= 0) {
                this.m_mode = 1;
                return;
            }
            if (this.m_bShotAlready) {
                for (int i = 0; i < Sprite.model.m_players.length; ++i) {
                    final PlayerInfo playerInfo = Sprite.model.m_players[i];
                    if (playerInfo.isPlaying() && playerInfo.m_portalSprite != null && WHUtil.distanceFrom(playerInfo.m_portalSprite, this) < 60.0) {
                        Sprite.model.usePowerup((byte)14, (byte)0, (byte)playerInfo.m_slot, Sprite.model.m_gameSession, WormholeModel.m_gameID);
                        this.killSelf();
                    }
                }
            }
        }
        else {
            super.indestructible = true;
            super.m_damage = Math.max(5, (int)(40.0 * (1000.0 - this.m_radius) / 1000.0));
            this.m_radius += 30;
            super.shapeRect.reshape(super.intx - this.m_radius - 10, super.inty - this.m_radius - 10, this.m_radius * 2 + 20, this.m_radius * 2 + 20);
            super.shouldRemoveSelf = (this.m_radius > 1000.0);
        }
    }
}
