package server;
import java.util.LinkedList;
import java.util.List;


public class ServerUser {
	private String m_username;
	private ServerThread m_serverThread;
	private int m_userId = -1;
	private short m_totalCredits;
	private byte m_subscriptionLevel;
	private byte m_slot;
	private byte m_teamId;
	private short m_rank;
	private String m_clan;
	private ServerTable m_table; 
	private List<String> m_icons;
	boolean m_isAlive;
	
	public ServerUser(ServerThread serverThread, String username){
		m_serverThread = serverThread;
		m_username = username;
		m_icons = new LinkedList<String>();
		m_table = null;
		m_teamId = 0;
		
		// Set some placeholder values that we aren't really using yet.
		m_rank = 0;
		m_clan = "--";
		m_icons.add("small-platinumWeapons.gif");
	}
	
	public ServerThread client() {
		return m_serverThread;
	}	
	public void setTeamId(byte teamId) {
		m_teamId = teamId;
	}
	public void setTable(ServerTable table){
		m_table = table;
	}
	public void setUserId(int id){
		m_userId = id;
	}
	public void setSlot(byte s) {
		m_slot = s;
	}
	public void setAlive(boolean val) {
		m_isAlive = val;
	}
	public ServerTable table(){
		return m_table;
	}
	public String username(){
		return m_username != null ? m_username : "";
	}
	public int userId(){
		return m_userId;
	}
	public short totalCredits(){
		return m_totalCredits;
	}
	public byte subscriptionLevel(){
		return m_subscriptionLevel;
	}
	public short rank(){
		return m_rank;
	}
	public String clan(){
		return m_clan;
	}
	public List<String> icons(){
		return m_icons;
	}
	public short numIcons(){
		return (short) m_icons.size();
	}
	public byte slot() {
		return m_slot;
	}
	public boolean isAlive() {
		return m_isAlive;
	}
	public byte teamId() {
		return m_teamId;
	}
}
