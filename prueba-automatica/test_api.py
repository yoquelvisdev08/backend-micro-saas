import requests
import json
import time
import datetime
import os
import sys
from pprint import pformat
import traceback

class ApiTester:
    def __init__(self, base_url="https://web-production-8d975.up.railway.app"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.site_id = None
        self.results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "tests": []
        }
        self.email = f"test_{int(time.time())}@example.com"  # Email único para cada ejecución
        self.password = "Test123456!"
        self.max_retries = 3
        self.retry_delay = 2  # segundos

    def add_result(self, endpoint, method, payload=None, response=None, success=True, notes=None):
        result = {
            "endpoint": endpoint,
            "method": method,
            "timestamp": datetime.datetime.now().isoformat(),
            "success": success,
            "payload": payload
        }
        
        if response:
            if isinstance(response, requests.Response):
                try:
                    result["response"] = response.json()
                except:
                    result["response"] = {"text": response.text, "status_code": response.status_code}
                result["status_code"] = response.status_code
            else:
                result["response"] = response
        
        if notes:
            result["notes"] = notes
            
        self.results["tests"].append(result)
        return result

    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def make_request(self, method, endpoint, payload=None, retry_on_failure=True):
        """Realizar una solicitud HTTP con reintentos en caso de error"""
        url = f"{self.base_url}{endpoint}"
        headers = self.get_headers()
        
        for attempt in range(self.max_retries):
            try:
                if method.upper() == "GET":
                    response = requests.get(url, headers=headers, timeout=20)
                elif method.upper() == "POST":
                    response = requests.post(url, headers=headers, json=payload, timeout=20)
                elif method.upper() == "PUT":
                    response = requests.put(url, headers=headers, json=payload, timeout=20)
                elif method.upper() == "DELETE":
                    response = requests.delete(url, headers=headers, timeout=20)
                else:
                    raise ValueError(f"Método HTTP no soportado: {method}")
                
                # Si tenemos éxito o no es un error de servidor, devolvemos la respuesta
                if not retry_on_failure or response.status_code < 500:
                    return response
                
                print(f"  ⚠️ Intento {attempt+1}: Error {response.status_code} en {endpoint} - Reintentando en {self.retry_delay}s")
                time.sleep(self.retry_delay)
                
            except Exception as e:
                if attempt == self.max_retries - 1:
                    print(f"  ❌ Error en la solicitud después de {self.max_retries} intentos: {str(e)}")
                    raise
                print(f"  ⚠️ Intento {attempt+1}: Error de conexión en {endpoint} - {str(e)} - Reintentando en {self.retry_delay}s")
                time.sleep(self.retry_delay)
        
        # Si llegamos aquí, todos los intentos han fallado
        return response  # Devolvemos la última respuesta con error

    def register_user(self):
        print("1. Registrando nuevo usuario...")
        endpoint = "/api/auth/register"
        payload = {
            "name": "Test User",
            "email": self.email,
            "password": self.password
        }
        
        try:
            response = self.make_request("POST", endpoint, payload)
            result = self.add_result(endpoint, "POST", payload, response)
            
            if response.status_code == 201:
                data = response.json()
                self.token = data.get("data", {}).get("token")
                self.user_id = data.get("data", {}).get("user", {}).get("id")
                print(f"  ✅ Usuario registrado exitosamente (ID: {self.user_id})")
            else:
                print(f"  ❌ Error al registrar usuario: {response.status_code}")
                print(f"  Respuesta: {response.text}")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al registrar usuario: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "POST", payload, str(e), False, "Error en la solicitud")

    def login(self):
        print("2. Iniciando sesión...")
        endpoint = "/api/auth/login"
        payload = {
            "email": self.email,
            "password": self.password
        }
        
        try:
            response = self.make_request("POST", endpoint, payload)
            result = self.add_result(endpoint, "POST", payload, response)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("data", {}).get("token")
                print("  ✅ Inicio de sesión exitoso")
            else:
                print(f"  ❌ Error al iniciar sesión: {response.status_code}")
                print(f"  Respuesta: {response.text}")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al iniciar sesión: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "POST", payload, str(e), False, "Error en la solicitud")

    def get_profile(self):
        print("3. Obteniendo perfil de usuario...")
        endpoint = "/api/auth/me"
        
        try:
            response = self.make_request("GET", endpoint)
            result = self.add_result(endpoint, "GET", None, response)
            
            if response.status_code == 200:
                print("  ✅ Perfil obtenido exitosamente")
            else:
                print(f"  ❌ Error al obtener perfil: {response.status_code}")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al obtener perfil: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "GET", None, str(e), False, "Error en la solicitud")

    def create_site(self, url="https://portafolio-six-sigma-45.vercel.app"):
        print(f"4. Creando nuevo sitio para monitorear ({url})...")
        endpoint = "/api/sites"
        payload = {
            "name": "Portfolio Testing Site",
            "url": url,
            "monitorSettings": {
                "checkFrequency": "daily",
                "enableAlerts": True,
                "checkPerformance": True,
                "checkKeywords": True,
                "alertThreshold": 2000
            },
            "keywords": "portfolio,developer,project,web"
        }
        
        try:
            response = self.make_request("POST", endpoint, payload)
            result = self.add_result(endpoint, "POST", payload, response)
            
            if response.status_code == 201:
                data = response.json()
                self.site_id = data.get("data", {}).get("site", {}).get("id")
                print(f"  ✅ Sitio creado exitosamente (ID: {self.site_id})")
            else:
                print(f"  ❌ Error al crear sitio: {response.status_code}")
                print(f"  Respuesta: {response.text}")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al crear sitio: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "POST", payload, str(e), False, "Error en la solicitud")

    def get_sites(self):
        print("5. Obteniendo lista de sitios...")
        endpoint = "/api/sites"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            sites_count = len(response.json().get("data", {}).get("sites", []))
            print(f"  ✅ Lista de sitios obtenida ({sites_count} sitios)")
        else:
            print(f"  ❌ Error al obtener sitios: {response.status_code}")
        
        return result

    def get_site_detail(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener detalles")
            return None
            
        print(f"6. Obteniendo detalles del sitio (ID: {self.site_id})...")
        endpoint = f"/api/sites/{self.site_id}"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Detalles del sitio obtenidos")
        else:
            print(f"  ❌ Error al obtener detalles: {response.status_code}")
        
        return result

    def update_site(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para actualizar")
            return None
            
        print(f"7. Actualizando sitio (ID: {self.site_id})...")
        endpoint = f"/api/sites/{self.site_id}"
        payload = {
            "name": "Portfolio Testing Site (Updated)",
            "url": "https://portafolio-six-sigma-45.vercel.app"
        }
        
        response = requests.put(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers(),
            json=payload
        )
        
        result = self.add_result(endpoint, "PUT", payload, response)
        
        if response.status_code == 200:
            print("  ✅ Sitio actualizado exitosamente")
        else:
            print(f"  ❌ Error al actualizar sitio: {response.status_code}")
        
        return result

    def get_logs(self):
        print("8. Obteniendo logs de actividad...")
        endpoint = "/api/logs"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            logs_count = len(response.json().get("data", {}).get("logs", []))
            print(f"  ✅ Logs obtenidos exitosamente ({logs_count} logs)")
        else:
            print(f"  ❌ Error al obtener logs: {response.status_code}")
        
        return result

    def get_stats(self):
        print("9. Obteniendo estadísticas generales...")
        endpoint = "/api/stats"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Estadísticas obtenidas exitosamente")
        else:
            print(f"  ❌ Error al obtener estadísticas: {response.status_code}")
        
        return result

    def get_user_stats(self):
        print("10. Obteniendo estadísticas de usuario...")
        endpoint = "/api/stats/user"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Estadísticas de usuario obtenidas exitosamente")
        else:
            print(f"  ❌ Error al obtener estadísticas de usuario: {response.status_code}")
        
        return result

    def get_activity_distribution(self):
        print("11. Obteniendo distribución de actividad...")
        endpoint = "/api/stats/activity"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Distribución de actividad obtenida exitosamente")
        else:
            print(f"  ❌ Error al obtener distribución: {response.status_code}")
        
        return result
        
    # MONITOR TESTS
    
    def run_site_monitor_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para monitorear")
            return None
            
        print(f"12. Ejecutando verificación de monitoreo completa para el sitio...")
        endpoint = f"/api/sites/{self.site_id}/monitor"
        
        try:
            response = self.make_request("POST", endpoint)
            result = self.add_result(endpoint, "POST", None, response)
            
            if response.status_code == 200:
                print("  ✅ Verificación de monitoreo ejecutada exitosamente")
            else:
                print(f"  ❌ Error al ejecutar verificación de monitoreo: {response.status_code}")
                # Mostrar más detalles del error para depuración
                if response.text:
                    print(f"  Detalles del error: {response.text[:200]}...")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al ejecutar verificación: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "POST", None, str(e), False, "Error en la solicitud")
        
    def run_site_basic_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar")
            return None
            
        print(f"13. Ejecutando verificación básica del sitio...")
        endpoint = f"/api/sites/{self.site_id}/check"
        
        try:
            response = self.make_request("GET", endpoint)
            result = self.add_result(endpoint, "GET", None, response)
            
            if response.status_code == 200:
                print("  ✅ Verificación básica ejecutada exitosamente")
            else:
                print(f"  ❌ Error al ejecutar verificación básica: {response.status_code}")
                # Mostrar más detalles del error para depuración
                if response.text:
                    print(f"  Detalles del error: {response.text[:200]}...")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al ejecutar verificación básica: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "GET", None, str(e), False, "Error en la solicitud")
        
    def run_site_ssl_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar SSL")
            return None
            
        print(f"14. Ejecutando verificación SSL del sitio...")
        endpoint = f"/api/sites/{self.site_id}/ssl"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación SSL ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación SSL: {response.status_code}")
        
        return result
        
    def run_site_performance_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar rendimiento")
            return None
            
        print(f"15. Ejecutando análisis de rendimiento del sitio...")
        endpoint = f"/api/sites/{self.site_id}/performance"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de rendimiento ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de rendimiento: {response.status_code}")
        
        return result
        
    def run_site_keyword_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar palabras clave")
            return None
            
        print(f"16. Ejecutando análisis de palabras clave del sitio...")
        endpoint = f"/api/sites/{self.site_id}/keywords"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de palabras clave ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de palabras clave: {response.status_code}")
        
        return result
        
    def run_site_hotspots_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para identificar puntos críticos")
            return None
            
        print(f"17. Identificando puntos críticos del sitio...")
        endpoint = f"/api/sites/{self.site_id}/hotspots"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Identificación de puntos críticos ejecutada exitosamente")
        else:
            print(f"  ❌ Error al identificar puntos críticos: {response.status_code}")
        
        return result
        
    def get_site_monitor_history(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener historial")
            return None
            
        print(f"18. Obteniendo historial de monitoreo del sitio...")
        endpoint = f"/api/sites/{self.site_id}/history"
        
        try:
            response = self.make_request("GET", endpoint)
            result = self.add_result(endpoint, "GET", None, response)
            
            if response.status_code == 200:
                print("  ✅ Historial de monitoreo obtenido exitosamente")
            else:
                print(f"  ❌ Error al obtener historial de monitoreo: {response.status_code}")
                # Mostrar más detalles del error para depuración
                if response.text:
                    print(f"  Detalles del error: {response.text[:200]}...")
            
            return result
        except Exception as e:
            print(f"  ❌ Excepción al obtener historial: {str(e)}")
            traceback.print_exc()
            return self.add_result(endpoint, "GET", None, str(e), False, "Error en la solicitud")
        
    def update_monitor_settings(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para actualizar configuración")
            return None
            
        print(f"19. Actualizando configuración de monitoreo del sitio...")
        endpoint = f"/api/monitor/site/{self.site_id}/settings"
        payload = {
            "checkFrequency": "daily",
            "enableAlerts": True,
            "checkPerformance": True,
            "checkKeywords": True,
            "alertThreshold": 2000
        }
        
        response = requests.put(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers(),
            json=payload
        )
        
        result = self.add_result(endpoint, "PUT", payload, response)
        
        if response.status_code == 200:
            print("  ✅ Configuración de monitoreo actualizada exitosamente")
        else:
            print(f"  ❌ Error al actualizar configuración de monitoreo: {response.status_code}")
        
        return result

    def run_monitor_basic_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar")
            return None
            
        print(f"20. Ejecutando verificación básica mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/basic"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación básica mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación básica mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_ssl_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar SSL")
            return None
            
        print(f"21. Ejecutando verificación SSL mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/ssl"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación SSL mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación SSL mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_performance_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar rendimiento")
            return None
            
        print(f"22. Ejecutando análisis de rendimiento mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/performance"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de rendimiento mediante monitor ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de rendimiento mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_keywords_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar palabras clave")
            return None
            
        print(f"23. Ejecutando análisis de palabras clave mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/keywords"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de palabras clave mediante monitor ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de palabras clave mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_hotspots_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para identificar puntos críticos")
            return None
            
        print(f"24. Identificando puntos críticos mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/hotspots"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Identificación de puntos críticos mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al identificar puntos críticos mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_full_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para ejecutar verificación completa")
            return None
            
        print(f"25. Ejecutando verificación completa mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/full"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación completa mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación completa mediante monitor: {response.status_code}")
        
        return result

    def get_monitor_history(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener historial")
            return None
            
        print(f"26. Obteniendo historial mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/history"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Historial mediante monitor obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener historial mediante monitor: {response.status_code}")
        
        return result

    def get_admin_monitor_overview(self):
        print(f"27. Obteniendo resumen de monitoreo para administrador...")
        endpoint = f"/api/monitor/admin/overview"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Resumen de monitoreo para administrador obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener resumen de monitoreo para administrador: {response.status_code}")
        
        return result

    def generate_report(self, format="json"):
        print(f"\nGenerando reporte en formato {format.upper()}...")
        
        if format == "json":
            filename = f"api_test_report_{int(time.time())}.json"
            with open(filename, "w") as f:
                json.dump(self.results, f, indent=2)
        else:  # txt
            filename = f"api_test_report_{int(time.time())}.txt"
            with open(filename, "w") as f:
                f.write(f"API TEST REPORT - {self.results['timestamp']}\n")
                f.write("=" * 80 + "\n\n")
                
                for idx, test in enumerate(self.results["tests"], 1):
                    f.write(f"TEST #{idx}: {test['method']} {test['endpoint']}\n")
                    f.write("-" * 80 + "\n")
                    f.write(f"Timestamp: {test['timestamp']}\n")
                    f.write(f"Success: {'Yes' if test['success'] else 'No'}\n")
                    
                    if test.get('status_code'):
                        f.write(f"Status Code: {test['status_code']}\n")
                    
                    if test.get('payload'):
                        f.write(f"\nPayload:\n{pformat(test['payload'])}\n")
                    
                    if test.get('response'):
                        f.write(f"\nResponse:\n{pformat(test['response'])}\n")
                    
                    if test.get('notes'):
                        f.write(f"\nNotes: {test['notes']}\n")
                    
                    f.write("\n" + "=" * 80 + "\n\n")
        
        print(f"✅ Reporte generado: {filename}")
        return filename

    def run_all_tests(self):
        print("\n📊 INICIANDO PRUEBAS DE LA API MICRO SAAS 📊\n")
        
        try:
            # Autenticación
            self.register_user()
            self.login()
            self.get_profile()
            
            # Sitios
            self.create_site()
            time.sleep(1)
            self.get_sites()
            time.sleep(1)
            self.get_site_detail()
            time.sleep(1)
            self.update_site()
            
            # Logs y estadísticas
            time.sleep(1)
            self.get_logs()
            time.sleep(1)
            self.get_stats()
            time.sleep(1)
            self.get_user_stats()
            time.sleep(1)
            self.get_activity_distribution()
            
            # Pruebas de monitoreo (endpoints en /api/sites/:id/...)
            # Añadimos un tiempo de espera entre pruebas para permitir que el servidor se recupere
            print("\nEjecutando pruebas de monitoreo con pausas entre ellas...\n")
            
            time.sleep(1)
            self.run_site_ssl_check()
            time.sleep(1)
            self.run_site_performance_check()
            time.sleep(1)
            self.run_site_keyword_check()
            time.sleep(1)
            self.run_site_hotspots_check()
            time.sleep(1)
            
            # Ahora probamos las rutas problemáticas con reintentos adicionales
            print("\nEjecutando pruebas en puntos críticos con mayor tiempo de espera...\n")
            
            time.sleep(2)
            self.run_site_monitor_check()
            time.sleep(2)
            self.run_site_basic_check() 
            time.sleep(2)
            self.get_site_monitor_history()
            
            # Pruebas de monitoreo (endpoints en /api/monitor/...)
            time.sleep(1)
            self.update_monitor_settings()
            time.sleep(1)
            self.run_monitor_basic_check()
            time.sleep(1)
            self.run_monitor_ssl_check()
            time.sleep(1)
            self.run_monitor_performance_check()
            time.sleep(1)
            self.run_monitor_keywords_check()
            time.sleep(1)
            self.run_monitor_hotspots_check()
            time.sleep(1)
            self.run_monitor_full_check()
            time.sleep(1)
            self.get_monitor_history()
            time.sleep(1)
            self.get_admin_monitor_overview()
            
            # Generar reporte
            self.generate_report("json")
            self.generate_report("txt")
            
            print("\n🎉 PRUEBAS COMPLETADAS 🎉")
            self.summarize_results()
            
        except Exception as e:
            print(f"\n❌ ERROR GENERAL DURANTE LAS PRUEBAS: {str(e)}")
            traceback.print_exc()
            self.add_result("ERROR", "ERROR", None, str(e), False, "Error durante la ejecución de pruebas")
            self.generate_report("json")
            self.generate_report("txt")
            sys.exit(1)
    
    def summarize_results(self):
        """Presenta un resumen de los resultados de las pruebas"""
        total_tests = len(self.results["tests"])
        successful_tests = sum(1 for test in self.results["tests"] if test["success"])
        failed_tests = total_tests - successful_tests
        
        print(f"\n==== RESUMEN DE PRUEBAS ====")
        print(f"Total de pruebas ejecutadas: {total_tests}")
        print(f"Pruebas exitosas: {successful_tests}")
        print(f"Pruebas fallidas: {failed_tests}")
        
        if failed_tests > 0:
            print("\nEndpoints con problemas:")
            for test in self.results["tests"]:
                if not test["success"]:
                    print(f"- {test['method']} {test['endpoint']}")


if __name__ == "__main__":
    print("Iniciando pruebas de API...")
    
    # Permitir especificar una URL base personalizada
    base_url = os.environ.get("API_BASE_URL", "https://web-production-8d975.up.railway.app")
    print(f"URL base de la API: {base_url}")
    
    tester = ApiTester(base_url)
    tester.run_all_tests()