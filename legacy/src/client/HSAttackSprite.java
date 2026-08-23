package client;
import java.awt.*;

public class HSAttackSprite extends Sprite
{
    private PlayerSprite m_player;
    private static final int MAX_JOINTS = 10;
    private int[][] m_lastJointPt;
    private int m_index;
    private Sprite m_targetSprite;
    
    public HSAttackSprite(final Sprite targetSprite) {
        super(Sprite.model.m_player.intx, Sprite.model.m_player.inty);
        this.m_lastJointPt = new int[10][2];
        this.init("has", super.intx, super.inty, false);
        this.setHealth(1, 20);
        super.shapeRect = new Rectangle(super.intx, super.inty, 10, 10);
        super.spriteType = 2;
        this.m_targetSprite = targetSprite;
        for (int i = 0; i < 10; ++i) {
            this.m_lastJointPt[i][0] = super.intx;
            this.m_lastJointPt[i][1] = super.inty;
        }
    }
    
    public void drawSelf(final Graphics g) {
        g.setColor(Sprite.g_colors[Sprite.model.m_slot][0]);
        for (int i = 0; i < 10; ++i) {
            final int index = (this.m_index + i) % 10;
            final int lastIndex = (index + 10 - 1) % 10;
            g.drawLine(this.m_lastJointPt[index][0], this.m_lastJointPt[index][1], this.m_lastJointPt[lastIndex][0], this.m_lastJointPt[lastIndex][1]);
        }
    }
    
    public void setCollided(final Sprite otherSprite) {
        super.setCollided(otherSprite);
        new ExplosionSprite(super.intx, super.inty, Sprite.model.m_slot).addSelf();
        final ParticleSprite ps = new ParticleSprite(super.intx, super.inty);
        ps.particleInit(5, 15);
        ps.addSelf();
    }
    
    public void behave() {
        super.behave();
        this.m_lastJointPt[this.m_index][0] = super.intx;
        this.m_lastJointPt[this.m_index++][1] = super.inty;
        this.m_index %= 10;
    }
}
