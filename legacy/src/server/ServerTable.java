package server;
import client.Team;

public class ServerTable {
	private short 		m_id = -1;
	private short 		m_numPlayers = 0;
	private boolean 	m_isRanked;
	private boolean 	m_isBigTable;
	private boolean 	m_allShipsAllowed;
	private boolean 	m_allPowerupsAllowed;
	private boolean 	m_isTeamTable;
	private boolean 	m_isBalancedTable;
	private boolean 	m_isPrivate;
	private byte 		m_boardSize;
	private byte		m_status;
	private String 		m_password;
	private String[]	m_names;
	private short[]		m_wins;
	private ServerUser[] m_users;
	
	public ServerTable(boolean isRanked, String password, boolean isBigTable, boolean allShipsAllowed, boolean allPowerupsAllowed, boolean isTeamTable, byte boardSize, boolean isBalancedTable){
		m_isRanked = isRanked;
		m_password = password;
		m_isBigTable = isBigTable;
		m_allShipsAllowed = allShipsAllowed;
		m_allPowerupsAllowed = allPowerupsAllowed;
		m_isTeamTable = isTeamTable;
		m_boardSize = boardSize;
		m_isBalancedTable = isBalancedTable;
		m_isPrivate = false;
		m_status = 0;
		
		int numSlots = isBigTable ? 8 : 4;
		m_names = new String[numSlots];
		m_users = new ServerUser[numSlots];
		m_wins = new short[numSlots];
			
		if (password.length() > 0) {
			m_isPrivate = true;
		}
	}
	
	public void removeUser(ServerUser user) {
		byte slot = user.slot();
		m_names[slot] = null;
		m_users[slot] = null;
		m_wins[slot] = 0;
		m_numPlayers --;
	}
	
	public void setId(short id) {
		m_id = id;
	}
	
	public boolean isFull() {
		for (int i=0; i<m_users.length; i++) {
			if (m_users[i] == null) {
				return false;
			}
		}
		return true;
	}
	
	public void setStatus(byte status) {
		m_status = status;
	}
	
	public void setPlayersAlive() {
		for (ServerUser user : m_users) {
			if (user != null) {
				user.setAlive(true);
			}
		}
	}

	public byte addUser(String username) {
		for (int i=0; i<m_names.length; i++) {
			if (m_names[i] == null) {
				m_names[i] = username;
				m_numPlayers ++;
				return (byte)i;
			}
		}
		return (byte)-1;
	}
	public byte addUser(ServerUser user) {
		for (int i=0; i<m_users.length; i++) {
			if (m_users[i] == null) {
				m_users[i] = user;
				return (byte)i;
			}
		}
		return (byte)-1;
	}
	public String player(int i) {
		return m_names[i] != null ? m_names[i] : "";
	}
	public short id() {
		return m_id;
	}
	public boolean isRanked() {
		return m_isRanked;
	}
	public boolean isBigTable() {
		return m_isBigTable;
	}
	public boolean allShipsAllowed() {
		return m_allShipsAllowed;
	}
	public boolean allPowerupsAllowed() {
		return m_allPowerupsAllowed;
	}
	public boolean isTeamTable() {
		return m_isTeamTable;
	}
	public boolean isBalancedTable() {
		return m_isBalancedTable;
	}
	public boolean isPrivate() {
		return m_isPrivate;
	}
	public boolean hasPlayer(String player) {
		for (int i=0; i<m_names.length; i++) {
			if (m_names[i] != null && m_names[i].equals(player)) {
				return true;
			}
		}
		return false;
	}
	public byte boardSize() {
		return m_boardSize;
	}
	public byte status() {
		return m_status;
	}
	public int numPlayerSlots() {
		return m_names.length;
	}
	public short numPlayers() {
		return m_numPlayers;
	}
	
	public int numPlayersAlive() {
		int count = 0;
		for (int i=0; i<m_users.length; i++) {
			if (m_users[i] != null) {
				if (m_users[i].isAlive()) {
					count ++;
				}
			}
		}
		return count;
	}
	
	public int numPlayersAlive(byte teamId) {
		int count = 0;
		for (int i=0; i<m_users.length; i++) {
			if (m_users[i] != null) {
				if (m_users[i].isAlive() && m_users[i].teamId() == teamId) {
					count ++;
				}
			}
		}
		return count;
	}
	
	public boolean gameOver() {
		if (isTeamTable()) {
			boolean goldTeamDead = numPlayersAlive(Team.GOLDTEAM) == 0;
			boolean blueTeamDead = numPlayersAlive(Team.BLUETEAM) == 0;
			return goldTeamDead || blueTeamDead;
		}

		return numPlayersAlive() == 1;
	}
	
	public void increaseWinCounts() {
		for (ServerUser user : users()) {
			if (user != null && user.isAlive()) {
				m_wins[user.slot()] ++;
			}
		}
	}
	
	public int teamSize(byte teamId) {
		int count = 0;
		for (ServerUser user : users()) {
			if (user != null && user.teamId() == teamId) {
				count ++;
			}
		}
		return count;
	}
	
	public byte winnerSlot() {
		if (isTeamTable()) {
			return numPlayersAlive(Team.GOLDTEAM) > 0 ? Team.GOLDTEAM : Team.BLUETEAM; 
		}
		
		for (ServerUser user : users()) {
			if (user != null && user.isAlive()) {
				return user.slot();
			}
		}
		
		return -1;
	}
	
	public ServerUser[] users() {
		return m_users;
	}
	
	public String password() {
		return m_password;
	}
	
	public short winCountOf(byte slot) {
		return m_wins[slot];
	}
}