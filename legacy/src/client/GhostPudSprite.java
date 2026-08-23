package client;
import java.awt.*;

public class GhostPudSprite extends Sprite
{
    private int m_stage;
    private static final int GP_TOTAL_SIZE = 40;
    private static final int GP_HALF_SIZE = 20;
    private int m_shotDelay;
    private static final int MAX_DIRECTION_DURATION = 130;
    private int m_directionalCycle;
    private int m_vx;
    private int m_vy;
    private static final int BUFFER_ZONE = 40;
    static final short[][] g_atomRingShape;
    private static final int GP_ANGLE = 15;
    private static final double GP_INIT_VELOCITY = 14.0;
    private static final int GP_PUNTABLE_WINDOW = 80;
    private final int GP_INNER_SIZE = 8;
    private final int GP_OUTER_SIZE = 11;
    private static final Polygon[] g_polyAtoms;
    
    public GhostPudSprite(final PortalSprite portalSprite, final int n) {
        super(0, 0);
        this.init("gp", portalSprite.intx, portalSprite.inty, true);
        super.m_bZappable = true;
        this.setHealth(super.spriteType = 1, 1);
        super.indestructible = true;
        super.shapeRect = new Rectangle(super.intx - 20, super.inty - 20, 40, 40);
        super.m_color = portalSprite.m_info.m_color;
        this.setDegreeAngle(portalSprite.m_currentDegrees + ((n == 0) ? 15 : -15));
        this.m_vx = (int)(14.0 * Math.cos(super.radAngle));
        this.m_vy = (int)(14.0 * Math.sin(super.radAngle));
        if (GhostPudSprite.g_polyAtoms[0] == null) {
            final RotationalPolygon constructPolygon = RotationalPolygon.constructPolygon(GhostPudSprite.g_atomRingShape, true);
            constructPolygon.rotate(0.0);
            GhostPudSprite.g_polyAtoms[0] = constructPolygon.cloneMyPolygon();
            constructPolygon.rotate(60.0);
            GhostPudSprite.g_polyAtoms[1] = constructPolygon.cloneMyPolygon();
            constructPolygon.rotate(60.0);
            GhostPudSprite.g_polyAtoms[2] = constructPolygon.cloneMyPolygon();
        }
        super.m_powerupType = 18;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.translate(super.intx, super.inty);
        graphics.setColor(Color.white);
        WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 8);
        if (this.m_directionalCycle > 0) {
            graphics.drawLine(-3, -3, -1, -3);
            graphics.drawLine(-2, -4, -2, -2);
            graphics.drawLine(3, -3, 1, -3);
            graphics.drawLine(2, -4, 2, -2);
            graphics.drawLine(-2, 2, 0, 1);
            graphics.drawLine(0, 1, 2, 2);
        }
        else {
            final int n = 1 - super.spriteCycle / 16 % 3;
            graphics.translate(n, 0);
            graphics.drawLine(-2, -3, -2, -2);
            graphics.drawLine(2, -3, 2, -2);
            graphics.translate(-n, 0);
            graphics.drawLine(-1, 1, 1, 1);
        }
        graphics.setColor(super.m_color);
        WHUtil.drawCenteredCircle(graphics, WHUtil.randInt(3), WHUtil.randInt(3), 11);
        WHUtil.drawCenteredCircle(graphics, WHUtil.randInt(3), WHUtil.randInt(3), 11);
        for (int i = 0; i < GhostPudSprite.g_polyAtoms.length; ++i) {
            WHUtil.drawPoly(graphics, GhostPudSprite.g_polyAtoms[i]);
        }
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (collided != Sprite.model.m_player) {
            this.m_directionalCycle = 130;
            this.m_shotDelay = 80;
            this.setVelocity(super.vectorx + collided.vectorx / 4.0, super.vectory + collided.vectory / 4.0);
            this.m_vx = WHUtil.randInt(3);
            this.m_vy = WHUtil.randInt(3);
        }
    }
    
    static {
        g_atomRingShape = new short[][] { { 0, -10 }, { 20, -9 }, { 27, -6 }, { 30, -3 }, { 32, 0 }, { 30, 3 }, { 27, 6 }, { 20, 9 }, { 0, 10 } };
        g_polyAtoms = new Polygon[3];
    }
    
    public void behave() {
        super.behave();
        if (this.m_directionalCycle <= 0) {
            if (super.intx < 40) {
                this.m_vx = 1;
            }
            else if (super.intx > super.boundingRect.width - 40) {
                this.m_vx = -1;
            }
            if (super.inty < 40) {
                this.m_vy = 1;
            }
            else if (super.inty > super.boundingRect.height - 40) {
                this.m_vy = -1;
            }
            this.setVelocity(this.m_vx, this.m_vy);
        }
        else if (super.spriteCycle > 80) {
            --this.m_directionalCycle;
            super.vectorx *= 0.95;
            super.vectory *= 0.95;
            if (Math.abs(super.vectorx) < 0.2) {
                super.vectorx = 0.0;
            }
            if (Math.abs(super.vectory) < 0.2) {
                super.vectory = 0.0;
            }
        }
        if (this.m_shotDelay > 0) {
            --this.m_shotDelay;
            for (int i = 0; i < Sprite.model.m_players.length; ++i) {
                final PlayerInfo playerInfo = Sprite.model.m_players[i];
                if (playerInfo.isPlaying() && playerInfo.m_portalSprite != null && WHUtil.distanceFrom(playerInfo.m_portalSprite, this) < 60.0) {
                    Sprite.model.usePowerup((byte)18, (byte)1, (byte)playerInfo.m_slot, Sprite.model.m_gameSession, WormholeModel.m_gameID);
                    this.killSelf();
                }
            }
        }
    }
}
