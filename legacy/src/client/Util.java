package client;
import java.util.*;
import java.net.*;
import java.awt.*;

public class Util
{
    private static /* synthetic */ Class class$java$awt$Frame;
    
    public static final int getIntProperty(final Properties properties, final String s, final int n) {
        try {
            return Integer.parseInt(properties.getProperty(s, "" + n));
        }
        catch (Exception ex) {
            return n;
        }
    }
    
//    public static final void openPage(final String s, final int n, final int n2, final String s2, final String s3, final String s4, final String s5, final String s6, final String s7) {
//        final String string = "self.open('" + s + "','_blank','width=" + n + ",height=" + n2 + ",toolbar=" + s7 + ",menubar=" + s6 + ",scrollbars=" + s3 + ",name=" + s2 + "status=" + s5 + ",location=" + s4 + "')";
//        try {
//            JSObject.getWindow(GamePanel.m_applet).eval(string);
//        }
//        catch (Exception ex) {}
//    }
    
//    public static final void openPage(final String s, final int n, final int n2, final String s2) {
//        try {
//            GamePanel.m_applet.getAppletContext().showDocument(new URL(s), s2);
//        }
//        catch (Exception ex) {}
//    }
    
    private static /* synthetic */ Class class$(final String s) {
        try {
            return Class.forName(s);
        }
        catch (ClassNotFoundException ex) {
            throw new NoClassDefFoundError(ex.getMessage());
        }
    }
    
    public static final Frame getParentFrame(final Component component) {
        Component parent = component.getParent();
        //for (parent = component; parent != null && !((Util.class$java$awt$Frame != null) ? Util.class$java$awt$Frame : (Util.class$java$awt$Frame = class$("java.awt.Frame"))).isAssignableFrom(((Frame)parent).getClass()); parent = parent.getParent()) {}
        if (parent instanceof Frame) {
            return (Frame)parent;
        }
        return null;
    }
}
