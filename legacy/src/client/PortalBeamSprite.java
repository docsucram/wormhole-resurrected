package client;
import java.awt.*;

public class PortalBeamSprite extends Sprite
{
    private PortalSprite m_portal;
    private double m_attackAngle;
    private double m_beamDirection;
    private int m_beamRad;
    private double m_timeLeft;
    private PlayerSprite m_player;
    private static final int BEAM_FORMING_DURATION = 45;
    private static final int BEAM_SHOOTING_DURATION = 320;
    private static final int BEAM_MAX_SIZE = 20;
    private static final double MAX_D_ANGLE = 0.006;
    private int m_stage;
    private static final int BEAM_FORMING = 0;
    private int m_formation;
    private static final int BEAM_SHRINK_RATE = 30;
    
    public PortalBeamSprite(final PortalSprite portal) {
        super(0, 0);
        this.init("beam", 0, 0, true);
        this.m_portal = portal;
        this.setHealth(10, super.spriteType = 1);
        super.indestructible = true;
        this.m_player = Sprite.model.m_player;
        super.shapeRect = new Rectangle(this.m_player.intx - 20, this.m_player.inty - 20, 40, 40);
        super.m_color = portal.m_info.m_color;
        super.m_slot = (byte)portal.m_info.m_slot;
        double n;
        if (WHUtil.randInt(2) == 1) {
            n = -0.25;
            this.m_beamDirection = 0.006;
        }
        else {
            n = 0.25;
            this.m_beamDirection = -0.006;
        }
        this.m_attackAngle = Math.atan2(this.m_player.inty - this.m_portal.inty, this.m_player.intx - this.m_portal.intx) + n;
        this.m_beamRad = 20;
        super.m_powerupType = 16;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(this.m_player.m_color);
        if (this.m_stage == 0) {
            graphics.setColor(Sprite.g_colors[super.m_slot][Math.max(0, (int)(19.0 - this.m_timeLeft * 20.0))]);
        }
        final double n = 1200.0 * Math.cos(this.m_attackAngle);
        final double n2 = 1200.0 * Math.sin(this.m_attackAngle);
        graphics.translate(this.m_portal.intx, this.m_portal.inty);
        int spriteCycle = super.spriteCycle;
        int n3 = 0;
        do {
            if (this.m_stage != 0) {
                graphics.setColor(Sprite.g_colors[super.m_slot][(n3 + super.spriteCycle) % 20]);
            }
            spriteCycle += 36;
            final int n4 = (int)(2 * this.m_beamRad * this.m_timeLeft * Math.cos(spriteCycle * 0.017453292519943295));
            final int n5 = (int)(this.m_beamRad * this.m_timeLeft * Math.sin(spriteCycle * 0.017453292519943295));
            graphics.drawLine(n4, n5, n4 + (int)n, n5 + (int)n2);
        } while (++n3 < 10);
        graphics.translate(-this.m_portal.intx, -this.m_portal.inty);
    }
    
    public void setCollided(final Sprite sprite) {
        if (sprite == this.m_player) {
            --this.m_beamRad;
        }
    }
    
    public boolean inViewingRect(final Rectangle rectangle) {
        return true;
    }
    
    public void behave() {
        super.behave();
        if (this.m_stage == 0) {
            if (this.m_formation++ > 45) {
                ++this.m_stage;
                super.spriteCycle = 0;
                this.m_timeLeft = 1.0;
                return;
            }
            this.m_timeLeft = this.m_formation / 45.0;
        }
        else {
            final int n = this.m_player.intx - this.m_portal.intx;
            final int n2 = this.m_player.inty - this.m_portal.inty;
            this.m_attackAngle += this.m_beamDirection;
            final double n3 = WHUtil.hyp(n, n2);
            super.shapeRect.setBounds((int)(Math.cos(this.m_attackAngle) * n3) + this.m_portal.intx - this.m_beamRad, (int)(Math.sin(this.m_attackAngle) * n3) + this.m_portal.inty - this.m_beamRad, this.m_beamRad * 2, this.m_beamRad * 2);
            if (super.spriteCycle % 30 == 0) {
                --this.m_beamRad;
            }
            if (super.spriteCycle > 320 || this.m_beamRad <= 2) {
                super.shouldRemoveSelf = true;
            }
        }
    }
}
