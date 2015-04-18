<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
  xmlns:android="http://schemas.android.com/apk/res/android">
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>
  <xsl:template match="/manifest/application/activity/@android:name">
    <xsl:attribute name="android:name">
      <xsl:value-of select="'MainActivity'"/>
    </xsl:attribute>
  </xsl:template>
</xsl:stylesheet>
