package client;
import java.util.*;
import java.awt.*;

public class CFProps
{
    Properties m_props;
    
    public CFProps(final Properties props) {
        this.m_props = props;
    }
    
    public int getInt(final String s, final int n) {
        return Util.getIntProperty(this.m_props, s, n);
    }
    
    public Color getColor(final String s) {
        final String property = this.m_props.getProperty(s);
        if (property != null) {
            final StringTokenizer stringTokenizer = new StringTokenizer(property, ",");
            try {
                return new Color(Integer.parseInt(stringTokenizer.nextToken()), Integer.parseInt(stringTokenizer.nextToken()), Integer.parseInt(stringTokenizer.nextToken()));
            }
            catch (Exception ex) {
                return Color.white;
            }
        }
        System.out.println("Color Property '" + s + "' is missing");
        return Color.white;
    }
    
    public String getString(final String s, final String s2) {
        return this.m_props.getProperty(s, s2);
    }
    
    public Rectangle getRect(final String s) {
        final String property = this.m_props.getProperty(s);
        if (property != null) {
            final StringTokenizer stringTokenizer = new StringTokenizer(property, ",");
            try {
                return new Rectangle(Integer.parseInt(stringTokenizer.nextToken()), Integer.parseInt(stringTokenizer.nextToken()), Integer.parseInt(stringTokenizer.nextToken()), Integer.parseInt(stringTokenizer.nextToken()));
            }
            catch (Exception ex) {
                System.out.println("getRect(): " + ex);
                return new Rectangle(0, 0, 100, 100);
            }
        }
        System.out.println("Rect Property '" + s + "' is missing");
        return new Rectangle(0, 0, 100, 100);
    }
}
